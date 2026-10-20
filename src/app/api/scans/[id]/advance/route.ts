import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { scans } from '@/db/schema'
import { ensureScanJobs } from '@/core/jobs/queue'
import { startBackgroundWorker } from '@/server/background-worker'

/** Enqueue/resume only. Slow providers and inference never hold this response. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = await getDb()
  let scan = (await db.select().from(scans).where(eq(scans.id, id)))[0]
  if (!scan) return Response.json({ error: 'Scan not found' }, { status: 404 })
  if (scan.status === 'paused') {
    await db.update(scans).set({ status: 'running', errorMessage: null }).where(eq(scans.id, id))
    scan = { ...scan, status: 'running', errorMessage: null }
  }
  await ensureScanJobs(db, id)
  startBackgroundWorker()
  return Response.json(scan, { status: 202 })
}
