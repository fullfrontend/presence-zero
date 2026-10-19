import { loadRuntimeSettings } from './runtime-settings'
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

function searxngSearch(db: Db, url: string, env: Record<string, string | undefined>) {
  const intervalMs = positiveMs(env.SEARXNG_MIN_INTERVAL_MS, 5000)
  const cooldownMs = positiveMs(env.SEARXNG_COOLDOWN_MS, 300000)
  const key = new URL(url).href.replace(/\/+$/, '')
  return createSearchThrottle(db, key, { intervalMs, cooldownMs })(createSearxngWebsiteSearch(url))
}

export function buildPipelineDeps(db: Db, env: Record<string, string | undefined> = process.env): PipelineDeps {
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
  const envBatch = Number(env.PRESENCEZERO_BATCH_SIZE)
  const batchSize = Number.isFinite(envBatch) && envBatch > 0 ? envBatch : undefined
  const searxngUrl = env.SEARXNG_ENABLED === 'true' ? env.SEARXNG_URL?.trim() : undefined
  const auditLead = buildAuditLead(env)
  return {
    db,
    braveSearchEnabled: !searxngUrl && env.BRAVE_SEARCH_ENABLED === 'true',
    ...(auditLead ? { auditLead, batchSize: batchSize ?? 1 } : {}),
    ...(batchSize ? { batchSize } : {}),
    ...(searxngUrl ? { discoverWebsite: searxngSearch(db, searxngUrl, env) } : {}),
  }
}

// Read once per scan step; changes never mutate process.env or other requests.
export async function loadPipelineDeps(db: Db): Promise<PipelineDeps> {
  const { env } = await loadRuntimeSettings(db)
  const secretEnv = { google_api_key: 'GOOGLE_PLACES_API_KEY', apify_token: 'APIFY_TOKEN', brave_search_api_key: 'BRAVE_SEARCH_API_KEY' }
  return { ...buildPipelineDeps(db, env), getSecret: async name => env[secretEnv[name]]?.trim() || undefined }
}
