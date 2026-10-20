import { eq } from 'drizzle-orm'
import type { InStatement, InValue } from '@libsql/client'
import { businesses, scans, scanJobs } from '@/db/schema'
import type { PipelineDeps } from '../pipeline'
import { getProvider, ProviderError } from '../providers/provider'
import { createWebsiteProbe } from '../probes/website-probe'
import { createRdapChecker } from '../probes/rdap'
import { createDrizzleRdapCache } from '../probes/rdap-cache-store'
import { generateDomainCandidates } from '../probes/domains'
import { isFacebookUrl, FACEBOOK_DETAIL } from '../probes/facebook'
import { createGooglePhoneLookup } from '../enrich/google-phone'
import { createWebsiteSearch } from '../enrich/website-search'
import type { PresenceStatus, ProviderConfig } from '../types'
import { collectedBusinessId, jobWrites, stageRows, type Job } from './queue'

class DeferredJob extends Error {
  constructor(public delay: number, public consumeAttempt: boolean, message: string) { super(message) }
}

/** Only network work happens outside the commit. Every resulting write is lease-fenced. */
export async function processJob(job: Job, deps: PipelineDeps, now: () => number = Date.now) {
  const { db } = deps
  const current = (await db.select().from(scanJobs).where(eq(scanJobs.id, job.id)))[0]
  if (!current || current.owner !== job.owner || current.status !== 'running' || current.leaseUntil <= now()) return
  try {
    const scan = (await db.select().from(scans).where(eq(scans.id, job.scanId)))[0]
    if (!scan) return
    const secret = async (name: Parameters<NonNullable<PipelineDeps['getSecret']>>[0]) => deps.getSecret?.(name)
    if (job.kind === 'collect') {
      const provider = (deps.getProviderById ?? getProvider)(scan.provider)
      const stored: ProviderConfig = scan.providerConfig ? JSON.parse(scan.providerConfig) : {}
      const page = await provider.fetchPage({ location: scan.location, category: scan.category, countryCode: scan.countryCode }, scan.providerCursor,
        { ...stored, apiKey: await secret('google_api_key'), apifyToken: await secret('apify_token') })
      const writer = jobWrites(job, now())
      const writes: InStatement[] = []
      page.businesses.forEach((raw, index) => {
        const id = collectedBusinessId(scan.id, scan.providerCursor, index)
        writes.push(writer.insert('businesses', { id, scan_id: scan.id, name: raw.name, address: raw.address ?? null,
          phone: raw.phone ?? null, category: raw.category ?? null, rating: raw.rating ?? null, review_count: raw.reviewCount ?? null,
          listed_website: raw.website ?? null, facebook_url: raw.facebookUrl ?? (isFacebookUrl(raw.website) ? raw.website! : null),
          source_url: raw.sourceUrl ?? null, lead_status: raw.closed ? 'skipped' : 'new' }))
        for (const row of stageRows(scan.id, id)) writes.push(writer.insert('scan_jobs', row))
      })
      writes.push(writer.raw('UPDATE scans SET total_found = (SELECT count(*) FROM businesses WHERE scan_id = ?), provider_cursor = ?, phase = ? WHERE id = ?',
        [scan.id, page.nextCursor, page.nextCursor === null ? 'process' : 'fetch', scan.id]))
      writes.push(writer.update('scan_jobs', job.id, { status: page.nextCursor === null ? 'done' : 'pending', attempts: 0, lease_until: 0, owner: null, error: null, available_at: now() }))
      await db.$client.batch(writes, 'write')
      return
    }
    const b = (await db.select().from(businesses).where(eq(businesses.id, job.businessId!)))[0]
    if (!b) throw new Error('Missing business')
    const patch: Record<string, InValue> = {}
    let auditFailed = false
    const domains: { domain: string; available: boolean | null }[] = []
    if (job.kind === 'search') {
      const key = deps.braveSearchEnabled ? await secret('brave_search_api_key') : undefined
      const search = deps.discoverWebsite ?? (key ? createWebsiteSearch(key) : undefined)
      if (search && (!b.listedWebsite || isFacebookUrl(b.listedWebsite))) {
        const result = await search({ name: b.name, address: b.address })
        if (result.retryAfterMs && !result.website) throw new DeferredJob(result.retryAfterMs, !result.deferred,
          result.deferred ? 'Waiting for the shared search throttle.' : 'Search rate limited or CAPTCHA blocked; retry scheduled.')
        // Search-only Facebook results never become listing evidence.
        patch.listed_website = result.website && !isFacebookUrl(result.website) ? result.website : b.listedWebsite
        patch.probe_detail = result.detail
        if (!patch.listed_website && !b.facebookUrl && result.outcome === 'not_found') patch.presence_status = 'not_found'
      }
    } else if (job.kind === 'probe') {
      const website = b.listedWebsite ?? b.facebookUrl
      let presence: PresenceStatus
      let detail: string
      if (isFacebookUrl(website)) { presence = 'facebook'; detail = FACEBOOK_DETAIL }
      else if (website) {
        const result = await (deps.probe ?? createWebsiteProbe())(website)
        presence = result.status; detail = result.detail
        if (presence === 'facebook') {
          const discovery = (await db.select().from(scanJobs).where(eq(scanJobs.id, `${b.id}:search`)))[0]
          const fromSource = isFacebookUrl(b.facebookUrl) || discovery?.result !== 'discovered'
          presence = fromSource ? 'facebook' : 'not_found'
          detail = fromSource ? FACEBOOK_DETAIL : 'The discovered URL leads to Facebook. Search-only Facebook results do not change lead potential.'
          if (!fromSource) patch.listed_website = null
        }
      } else {
        presence = b.presenceStatus === 'not_found' ? 'not_found' : 'none'
        detail = presence === 'not_found' ? 'No website found after search.' : 'No website was listed on the source listing. Website presence is unverified.'
      }
      patch.presence_status = presence
      patch.probe_detail = [b.probeDetail, detail].filter(Boolean).join(' ')
    } else if (job.kind === 'domains' && b.presenceStatus !== 'alive') {
      const check = deps.checkDomain ?? createRdapChecker({ cache: createDrizzleRdapCache(db) })
      for (const domain of generateDomainCandidates(b.name, scan.countryCode)) domains.push({ domain, available: await check(domain) })
    } else if (job.kind === 'phone' && !b.phone) {
      const key = await secret('google_api_key')
      const enrich = deps.enrichPhone ?? (key ? createGooglePhoneLookup(key) : undefined)
      const phone = enrich ? await enrich(b.name, b.address) : null
      if (phone) patch.phone = phone
    } else if (job.kind === 'audit' && deps.auditLead && !b.auditReport) {
      const report = await deps.auditLead({ name: b.name, address: b.address, phone: b.phone,
        category: b.category ?? scan.category, rating: b.rating, reviewCount: b.reviewCount,
        website: b.listedWebsite, presence: b.presenceStatus ?? 'none' })
      if (report.status === 'failed' && job.attempts < 2) throw new Error('Audit unavailable')
      auditFailed = report.status === 'failed'
      patch.audit_report = JSON.stringify(report)
    }
    const writer = jobWrites(job, now())
    const writes: InStatement[] = []
    if (Object.keys(patch).length) writes.push(writer.update('businesses', b.id, patch))
    for (const d of domains) writes.push(writer.insert('domain_candidates', { id: `${b.id}:${d.domain}`, business_id: b.id,
      domain: d.domain, available: d.available === null ? null : Number(d.available), checked_at: Math.floor(now() / 1000) }))
    writes.push(writer.update('scan_jobs', job.id, { result: job.kind === 'search' && patch.listed_website && patch.listed_website !== b.listedWebsite ? 'discovered' : null, status: auditFailed ? 'failed' : 'done', lease_until: 0, owner: null, error: auditFailed ? 'Audit unavailable or model output invalid.' : null }))
    await db.$client.batch(writes, 'write')
  } catch (error) {
    await failJob(job, deps, error, now())
  }
}

export async function failJob(job: Job, deps: Pick<PipelineDeps, 'db'>, error: unknown, now = Date.now()) {
  const writer = jobWrites(job, now)
  const writes: InStatement[] = []
  if (job.kind === 'collect' && error instanceof ProviderError) {
    writes.push(writer.update('scans', job.scanId, { status: error.recoverable ? 'paused' : 'failed', error_message: error.message,
      ...(error.recoverable && error.nextCursor !== undefined ? { provider_cursor: error.nextCursor } : {}) }))
    writes.push(writer.update('scan_jobs', job.id, { status: error.recoverable ? 'pending' : 'failed', attempts: 0, lease_until: 0, owner: null, error: error.message }))
  } else {
    const deferred = error instanceof DeferredJob
    const attempt = deferred && !error.consumeAttempt ? Math.max(0, job.attempts - 1) : job.attempts
    const retry = (deferred && !error.consumeAttempt) || attempt < (job.kind === 'search' ? 3 : 2)
    const message = deferred ? error.message : `${job.kind} task failed.`
    if (!retry && job.kind === 'probe' && job.businessId) writes.push(writer.update('businesses', job.businessId, { presence_status: 'probe_failed', probe_detail: 'The check itself failed.' }))
    if (!retry && job.kind === 'collect') writes.push(writer.update('scans', job.scanId, { status: 'failed', error_message: 'Collection failed. Already collected prospects are preserved.' }))
    writes.push(writer.update('scan_jobs', job.id, { status: retry ? 'pending' : 'failed', attempts: attempt,
      available_at: now + (deferred ? Math.max(100, error.delay) : 2000 * attempt), lease_until: 0, owner: null, error: message }))
  }
  await deps.db.$client.batch(writes, 'write')
}
