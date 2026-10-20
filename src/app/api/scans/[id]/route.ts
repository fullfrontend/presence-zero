import { JOB_KINDS } from '@/core/jobs/queue'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { scans, scanJobs } from '@/db/schema'
import { patchScanSchema } from '@/server/validation'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = await getDb()
  const row = (await db.select().from(scans).where(eq(scans.id, id)))[0]
  if (!row) return Response.json({ error: 'Scan not found' }, { status: 404 })
  const jobs = await db.select().from(scanJobs).where(eq(scanJobs.scanId, id))
  const enrichment = { pending: 0, running: 0, failed: 0, done: 0 }
  for (const job of jobs) if (job.kind !== 'collect') enrichment[job.status]++
  const stages = JOB_KINDS.map(kind => ({
    kind,
    running: jobs.filter(job => job.kind === kind && job.status === 'running').length,
    pending: jobs.filter(job => job.kind === kind && job.status === 'pending').length,
  }))
  return Response.json({ ...row, enrichment, stages })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const parsed = patchScanSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const db = await getDb()
  const existing = (await db.select().from(scans).where(eq(scans.id, id)))[0]
  if (!existing) return Response.json({ error: 'Scan not found' }, { status: 404 })
  const { paused, ...metadata } = parsed.data
  await db.update(scans).set({ ...metadata,
    ...(paused !== undefined && existing.status !== 'done' && existing.status !== 'failed'
      ? { status: paused ? 'paused' as const : 'running' as const, errorMessage: paused ? 'Paused by you.' : null } : {}),
  }).where(eq(scans.id, id))
  const updated = (await db.select().from(scans).where(eq(scans.id, id)))[0]
  return Response.json(updated)
}
