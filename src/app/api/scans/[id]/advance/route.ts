import { getDb } from '@/db/client'
import { advanceScan } from '@/core/pipeline'
import { buildPipelineDeps } from '@/server/pipeline-deps'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = await getDb()
  const result = await advanceScan(id, buildPipelineDeps(db))
  return Response.json(result)
}
