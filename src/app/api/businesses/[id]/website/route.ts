import { getDb } from '@/db/client'
import { setManualWebsite } from '@/core/jobs/manual-website'
import { manualWebsiteSchema } from '@/server/validation'
import { loadRuntimeSettings } from '@/server/runtime-settings'
import { startBackgroundWorker } from '@/server/background-worker'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const parsed = manualWebsiteSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Enter a valid independent website URL (HTTP or HTTPS).' }, { status: 400 })
  const db = await getDb()
  const result = await setManualWebsite(db, id, parsed.data.website)
  if (!result) return Response.json({ error: 'Business not found' }, { status: 404 })
  const { env } = await loadRuntimeSettings(db)
  startBackgroundWorker()
  return Response.json({ ...result, website: parsed.data.website, aiEnabled: env.AI_AUDIT_ENABLED === 'true' }, { status: 202 })
}
