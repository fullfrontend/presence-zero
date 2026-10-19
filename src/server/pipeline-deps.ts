import { buildAuditLead } from './audit-deps'
import { createSearchThrottle } from '@/core/enrich/search-throttle'
import { createSearxngWebsiteSearch } from '@/core/enrich/website-search'
import type { Db } from '@/db/client'
import type { PipelineDeps } from '@/core/pipeline'
import { registerBuiltInProviders } from '@/core/providers'
import { registerProvider } from '@/core/providers/provider'
import { createApifyProvider, MAX_PLACES_CEILING } from '@/core/providers/apify'
import { parseApifyMaxPlacesCeiling } from '@/server/validation'

let registered = false

function positiveMs(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.trunc(n), 3600000) : fallback
}

function searxngSearch(db: Db, url: string) {
  const intervalMs = positiveMs(process.env.SEARXNG_MIN_INTERVAL_MS, 5000)
  const cooldownMs = positiveMs(process.env.SEARXNG_COOLDOWN_MS, 300000)
  const key = new URL(url).href.replace(/\/+$/, '')
  return createSearchThrottle(db, key, { intervalMs, cooldownMs })(createSearxngWebsiteSearch(url))
}

export function buildPipelineDeps(db: Db): PipelineDeps {
  if (!registered) {
    registerBuiltInProviders()
    // Self-hosters on a paid Apify plan may raise the per-scan ceiling. Shares the same
    // parser as the route-boundary ceiling in validation.ts so the two can never desync.
    // Re-registering the same id overwrites the default in the registry Map.
    const envCeiling = parseApifyMaxPlacesCeiling(process.env.APIFY_MAX_PLACES)
    if (envCeiling !== MAX_PLACES_CEILING) {
      registerProvider(createApifyProvider({ maxPlacesCeiling: envCeiling }))
    }
    registered = true
  }
  const envBatch = Number(process.env.PRESENCEZERO_BATCH_SIZE)
  const batchSize = Number.isFinite(envBatch) && envBatch > 0 ? envBatch : undefined
  const searxngUrl = process.env.SEARXNG_ENABLED === 'true' ? process.env.SEARXNG_URL?.trim() : undefined
  const auditLead = buildAuditLead()
  return {
    db,
    braveSearchEnabled: !searxngUrl && process.env.BRAVE_SEARCH_ENABLED === 'true',
    ...(auditLead ? { auditLead, batchSize: batchSize ?? 1 } : {}),
    ...(batchSize ? { batchSize } : {}),
    ...(searxngUrl ? { discoverWebsite: searxngSearch(db, searxngUrl) } : {}),
  }
}
