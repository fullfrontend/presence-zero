import { getDb } from '@/db/client'
import { advanceScan, type AdvanceResult } from '@/core/pipeline'
import { loadPipelineDeps } from '@/server/pipeline-deps'

const inFlight = new Map<string, Promise<AdvanceResult>>()

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const existing = inFlight.get(id)
  if (existing) return Response.json(await existing)
  const db = await getDb()
  const p = loadPipelineDeps(db).then(deps => advanceScan(id, deps)).finally(() => inFlight.delete(id))
  inFlight.set(id, p)
  return Response.json(await p)
}
