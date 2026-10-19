import type { AuditLead } from './audit/types'
import { isFacebookUrl, FACEBOOK_DETAIL } from './probes/facebook'
import { and, eq, isNull, sql } from 'drizzle-orm'
import type { SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core'
import { randomUUID } from 'node:crypto'
import type { Db } from '@/db/client'
import { businesses, domainCandidates, scans, settings } from '@/db/schema'
import { getProvider, ProviderError, type Provider } from './providers/provider'
import { createWebsiteProbe, type ProbeResult } from './probes/website-probe'
import { generateDomainCandidates } from './probes/domains'
import { createRdapChecker } from './probes/rdap'
import { createDrizzleRdapCache } from './probes/rdap-cache-store'
import { createGooglePhoneLookup } from './enrich/google-phone'
import { createWebsiteSearch, type WebsiteSearchInput, type WebsiteSearchResult } from './enrich/website-search'
import { computeScore } from './scoring'
import type { PresenceStatus, ProviderConfig, ScanArea } from './types'

export type SecretName = 'google_api_key' | 'apify_token' | 'brave_search_api_key'

const ENV_BY_SECRET: Record<SecretName, string> = {
  google_api_key: 'GOOGLE_PLACES_API_KEY',
  apify_token: 'APIFY_TOKEN',
  brave_search_api_key: 'BRAVE_SEARCH_API_KEY',
}

export interface PipelineDeps {
  db: Db
  getProviderById?: (id: string) => Provider
  probe?: (url: string) => Promise<ProbeResult>
  checkDomain?: (domain: string) => Promise<boolean | null>
  getSecret?: (name: SecretName) => Promise<string | undefined>
  enrichPhone?: (name: string, address: string | null) => Promise<string | null>
  discoverWebsite?: (input: WebsiteSearchInput) => Promise<WebsiteSearchResult>
  braveSearchEnabled?: boolean
  auditLead?: AuditLead
  batchSize?: number
}

export interface AdvanceResult {
  status: 'running' | 'paused' | 'done' | 'failed'
  phase: 'fetch' | 'process' | 'retry' | 'done'
  totalFound: number
  totalProcessed: number
  errorMessage: string | null
}

type Scan = typeof scans.$inferSelect
type BusinessRow = typeof businesses.$inferSelect

function snapshot(scan: Scan): AdvanceResult {
  return {
    status: scan.status, phase: scan.phase,
    totalFound: scan.totalFound, totalProcessed: scan.totalProcessed,
    errorMessage: scan.errorMessage ?? null,
  }
}

export async function advanceScan(scanId: string, deps: PipelineDeps): Promise<AdvanceResult> {
  const { db } = deps
  const batchSize = deps.batchSize ?? 8
  const getProviderById = deps.getProviderById ?? getProvider
  const probe = deps.probe ?? createWebsiteProbe()
  const checkDomain = deps.checkDomain ?? createRdapChecker({ cache: createDrizzleRdapCache(db) })
  const getSecret = deps.getSecret ?? (async (name: SecretName) => {
    const fromEnv = process.env[ENV_BY_SECRET[name]]
    if (fromEnv) return fromEnv
    const rows = await db.select().from(settings).where(eq(settings.key, name))
    return rows[0]?.value
  })

  const scan = (await db.select().from(scans).where(eq(scans.id, scanId)))[0]
  if (!scan) throw new Error(`Scan not found: ${scanId}`)
  if (scan.status === 'done' || scan.status === 'failed') return snapshot(scan)

  const readSecret = async (name: SecretName) => {
    try { return await getSecret(name) } catch { return undefined }
  }
  const apiKey = await readSecret('google_api_key')
  const apifyToken = await readSecret('apify_token')
  const braveEnabled = deps.braveSearchEnabled ?? (process.env.BRAVE_SEARCH_ENABLED === 'true')
  const braveKey = braveEnabled && !deps.discoverWebsite ? await readSecret('brave_search_api_key') : undefined
  const discoverWebsite = deps.discoverWebsite ?? (braveKey ? createWebsiteSearch(braveKey) : undefined)
  const enrichPhone = deps.enrichPhone ?? (apiKey ? createGooglePhoneLookup(apiKey) : async () => null)

  const area: ScanArea = { location: scan.location, category: scan.category, countryCode: scan.countryCode }

  const update = async (values: SQLiteUpdateSetSource<typeof scans>) => {
    await db.update(scans).set(values).where(eq(scans.id, scanId))
  }

  const processBusiness = async (b: BusinessRow): Promise<void> => {
    try {
      const sourceFacebook = b.facebookUrl ?? (isFacebookUrl(b.listedWebsite) ? b.listedWebsite : null)
      let website = b.listedWebsite ?? sourceFacebook
      let discoveryDetail = ''
      let searchNotFound = false
      let discoveredWebsite = false
      if ((!website || isFacebookUrl(website)) && discoverWebsite && !b.retried) {
        try {
          const discovery = await discoverWebsite({ name: b.name, address: b.address })
          if (discovery.retryAfterMs && !discovery.website) {
            throw new ProviderError(`SearXNG is rate limited or blocked by a CAPTCHA. Wait ${Math.ceil(discovery.retryAfterMs / 1000)} seconds before resuming. Progress is saved.`, true)
          }
          discoveredWebsite = !!discovery.website
          website = discovery.website ?? website
          discoveryDetail = discovery.detail
          searchNotFound = discovery.outcome === 'not_found'
        } catch (err) {
          if (err instanceof ProviderError) throw err
          discoveryDetail = 'Web search failed; website presence remains unverified.'
        }
        // Persist before probing so retries reuse the discovery instead of spending
        // another search request. No result is ever interpreted as confirmed absence.
        await db.update(businesses).set({ listedWebsite: website, probeDetail: discoveryDetail })
          .where(eq(businesses.id, b.id))
      }
      const outcome: { status: PresenceStatus; detail: string } = isFacebookUrl(website)
        ? { status: 'facebook', detail: FACEBOOK_DETAIL }
        : website
          ? await probe(website)
          : { status: searchNotFound ? 'not_found' : 'none', detail: searchNotFound
            ? 'No website found after search.'
            : 'No website was listed on the source listing. Website presence is unverified.' }
      if (discoveredWebsite && outcome.status === 'facebook') {
        // Facebook evidence must come from the original listing, not web search.
        outcome.status = isFacebookUrl(sourceFacebook) ? 'facebook' : 'not_found'
        outcome.detail = isFacebookUrl(sourceFacebook) ? FACEBOOK_DETAIL
          : 'The discovered URL leads to Facebook, not an independent website. Search-only Facebook results do not change lead potential.'
        await db.update(businesses).set({ listedWebsite: b.listedWebsite })
          .where(eq(businesses.id, b.id))
      }
      if (discoveryDetail) outcome.detail = `${discoveryDetail} ${outcome.detail}`
      const presence = outcome.status
      let exactComAvailable = false
      if (presence !== 'alive') {
        const candidates = generateDomainCandidates(b.name, scan.countryCode)
        for (const domain of candidates) {
          const available = await checkDomain(domain)
          await db.insert(domainCandidates).values({
            id: randomUUID(), businessId: b.id, domain, available, checkedAt: new Date(),
          })
          if (domain === candidates[0] && domain.endsWith('.com') && available === true) exactComAvailable = true
        }
      }
      let found: string | null = null
      if (!b.phone) { try { found = await enrichPhone(b.name, b.address) } catch { found = null } }
      const score = computeScore({
        presence, reviewCount: b.reviewCount, rating: b.rating,
        exactComAvailable, hasPhone: !!(b.phone || found),
      })
      await db.update(businesses)
        .set({ presenceStatus: presence, probeDetail: outcome.detail, score, ...(found ? { phone: found } : {}) })
        .where(eq(businesses.id, b.id))
      if (deps.auditLead && !b.auditReport) {
        // Auditing is optional enrichment; an inference failure must not overwrite presence/scoring.
        try {
          const auditReport = await deps.auditLead({ name: b.name, address: b.address, phone: b.phone || found,
            category: b.category ?? scan.category, rating: b.rating, reviewCount: b.reviewCount,
            website, presence })
          await db.update(businesses).set({ auditReport }).where(eq(businesses.id, b.id))
        } catch { /* Injected audit failures leave the completed business check intact. */ }
      }
    } catch (err) {
      if (err instanceof ProviderError) throw err
      await db.update(businesses)
        .set({
          presenceStatus: 'probe_failed', score: 0,
          probeDetail: 'The check itself failed.',
        })
        .where(eq(businesses.id, b.id))
    }
  }

  try {
    if (scan.phase === 'fetch') {
      const provider = getProviderById(scan.provider)
      const stored: ProviderConfig = scan.providerConfig ? JSON.parse(scan.providerConfig) : {}
      const config: ProviderConfig = { ...stored, apiKey, apifyToken }
      const page = await provider.fetchPage(area, scan.providerCursor, config)
      if (page.businesses.length > 0) {
        await db.insert(businesses).values(page.businesses.map(raw => ({
          id: randomUUID(), scanId, name: raw.name, address: raw.address, phone: raw.phone,
          category: raw.category, rating: raw.rating, reviewCount: raw.reviewCount,
          listedWebsite: raw.website,
          facebookUrl: raw.facebookUrl ?? (isFacebookUrl(raw.website) ? raw.website : undefined),
          sourceUrl: raw.sourceUrl,
          leadStatus: raw.closed ? ('skipped' as const) : ('new' as const),
        })))
      }
      await update({
        totalFound: scan.totalFound + page.businesses.length,
        providerCursor: page.nextCursor,
        phase: page.nextCursor === null ? 'process' : 'fetch',
        status: 'running', errorMessage: null,
      })
    } else if (scan.phase === 'process') {
      const batch = await db.select().from(businesses)
        .where(and(eq(businesses.scanId, scanId), isNull(businesses.presenceStatus)))
        .limit(batchSize)
      if (batch.length === 0) {
        await update({ phase: 'retry', status: 'running', errorMessage: null })
      } else {
        for (const b of batch) {
          await processBusiness(b)
          await update({ totalProcessed: sql`${scans.totalProcessed} + 1`, status: 'running', errorMessage: null })
        }
      }
    } else if (scan.phase === 'retry') {
      const batch = await db.select().from(businesses)
        .where(and(
          eq(businesses.scanId, scanId),
          eq(businesses.presenceStatus, 'probe_failed'),
          eq(businesses.retried, false),
        ))
        .limit(batchSize)
      if (batch.length === 0) {
        await update({ phase: 'done', status: 'done', errorMessage: null })
      } else {
        for (const b of batch) {
          await db.update(businesses).set({ retried: true }).where(eq(businesses.id, b.id))
          await processBusiness({ ...b, retried: true })
        }
      }
    }
  } catch (err) {
    if (err instanceof ProviderError) {
      await update({
        status: err.recoverable ? 'paused' : 'failed',
        errorMessage: err.message,
        ...(err.recoverable && err.nextCursor !== undefined ? { providerCursor: err.nextCursor } : {}),
      })
    } else {
      await update({ status: 'failed', errorMessage: 'Unexpected error during scan — check server logs.' })
    }
  }

  const fresh = (await db.select().from(scans).where(eq(scans.id, scanId)))[0]
  return snapshot(fresh)
}
