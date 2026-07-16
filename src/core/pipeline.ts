import { and, eq, isNull, sql } from 'drizzle-orm'
import type { SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core'
import { randomUUID } from 'node:crypto'
import type { Db } from '@/db/client'
import { businesses, domainCandidates, scans, settings } from '@/db/schema'
import { getProvider, ProviderError, type Provider } from './providers/provider'
import { createWebsiteProbe } from './probes/website-probe'
import { generateDomainCandidates } from './probes/domains'
import { createRdapChecker } from './probes/rdap'
import { createDrizzleRdapCache } from './probes/rdap-cache-store'
import { computeScore } from './scoring'
import type { ProviderConfig, ScanArea } from './types'

export interface PipelineDeps {
  db: Db
  getProviderById?: (id: string) => Provider
  probe?: (url: string) => Promise<'alive' | 'dead' | 'parked'>
  checkDomain?: (domain: string) => Promise<boolean | null>
  getApiKey?: () => Promise<string | undefined>
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
  const batchSize = deps.batchSize ?? 25
  const getProviderById = deps.getProviderById ?? getProvider
  const probe = deps.probe ?? createWebsiteProbe()
  const checkDomain = deps.checkDomain ?? createRdapChecker({ cache: createDrizzleRdapCache(db) })
  const getApiKey = deps.getApiKey ?? (async () => {
    if (process.env.GOOGLE_PLACES_API_KEY) return process.env.GOOGLE_PLACES_API_KEY
    const rows = await db.select().from(settings).where(eq(settings.key, 'google_api_key'))
    return rows[0]?.value
  })

  const scan = (await db.select().from(scans).where(eq(scans.id, scanId)))[0]
  if (!scan) throw new Error(`Scan not found: ${scanId}`)
  if (scan.status === 'done' || scan.status === 'failed') return snapshot(scan)

  const area: ScanArea = { location: scan.location, category: scan.category, countryCode: scan.countryCode }

  const update = async (values: SQLiteUpdateSetSource<typeof scans>) => {
    await db.update(scans).set(values).where(eq(scans.id, scanId))
  }

  const processBusiness = async (b: BusinessRow): Promise<void> => {
    try {
      const presence = b.listedWebsite ? await probe(b.listedWebsite) : 'none'
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
      const score = computeScore({
        presence, reviewCount: b.reviewCount, rating: b.rating,
        exactComAvailable, hasPhone: !!b.phone,
      })
      await db.update(businesses).set({ presenceStatus: presence, score }).where(eq(businesses.id, b.id))
    } catch {
      await db.update(businesses).set({ presenceStatus: 'probe_failed', score: 0 }).where(eq(businesses.id, b.id))
    }
  }

  try {
    if (scan.phase === 'fetch') {
      const provider = getProviderById(scan.provider)
      const stored: ProviderConfig = scan.providerConfig ? JSON.parse(scan.providerConfig) : {}
      const config: ProviderConfig = { ...stored, apiKey: await getApiKey() }
      const page = await provider.fetchPage(area, scan.providerCursor, config)
      if (page.businesses.length > 0) {
        await db.insert(businesses).values(page.businesses.map(raw => ({
          id: randomUUID(), scanId, name: raw.name, address: raw.address, phone: raw.phone,
          category: raw.category, rating: raw.rating, reviewCount: raw.reviewCount,
          listedWebsite: raw.website,
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
        await update({ phase: 'retry' })
      } else {
        for (const b of batch) await processBusiness(b)
        await update({ totalProcessed: sql`${scans.totalProcessed} + ${batch.length}` })
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
        await update({ phase: 'done', status: 'done' })
      } else {
        for (const b of batch) {
          await db.update(businesses).set({ retried: true }).where(eq(businesses.id, b.id))
          await processBusiness(b)
        }
      }
    }
  } catch (err) {
    if (err instanceof ProviderError) {
      await update({ status: err.recoverable ? 'paused' : 'failed', errorMessage: err.message })
    } else {
      await update({ status: 'failed', errorMessage: 'Unexpected error during scan — check server logs.' })
    }
  }

  const fresh = (await db.select().from(scans).where(eq(scans.id, scanId)))[0]
  return snapshot(fresh)
}
