import type { Db } from '@/db/client'
import type { PipelineDeps } from '@/core/pipeline'
import { registerBuiltInProviders } from '@/core/providers'
import { registerProvider } from '@/core/providers/provider'
import { createApifyProvider, MAX_PLACES_CEILING } from '@/core/providers/apify'
import { parseApifyMaxPlacesCeiling } from '@/server/validation'

let registered = false

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
  return { db, ...(batchSize ? { batchSize } : {}) }
}
