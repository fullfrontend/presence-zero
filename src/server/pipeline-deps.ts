import type { Db } from '@/db/client'
import type { PipelineDeps } from '@/core/pipeline'
import { registerBuiltInProviders } from '@/core/providers'

let registered = false

export function buildPipelineDeps(db: Db): PipelineDeps {
  if (!registered) { registerBuiltInProviders(); registered = true }
  const envBatch = Number(process.env.PRESENCEZERO_BATCH_SIZE)
  const batchSize = Number.isFinite(envBatch) && envBatch > 0 ? envBatch : undefined
  return { db, ...(batchSize ? { batchSize } : {}) }
}
