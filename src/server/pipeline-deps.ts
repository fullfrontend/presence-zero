import type { Db } from '@/db/client'
import type { PipelineDeps } from '@/core/pipeline'
import { registerBuiltInProviders } from '@/core/providers'

let registered = false

export function buildPipelineDeps(db: Db): PipelineDeps {
  if (!registered) { registerBuiltInProviders(); registered = true }
  return { db }
}
