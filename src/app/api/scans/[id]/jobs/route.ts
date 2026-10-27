import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { businesses, scans, scanJobs } from '@/db/schema'
import { retryFailedJobs } from '@/core/jobs/retry'
import { retryJobsSchema } from '@/server/validation'
import { startBackgroundWorker } from '@/server/background-worker'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = await getDb()
  if (!(await db.select({ id: scans.id }).from(scans).where(eq(scans.id, id)))[0]) return Response.json({ error: 'Scan not found' }, { status: 404 })
  const jobs = await db.select({ id: scanJobs.id, kind: scanJobs.kind, error: scanJobs.error,
    attempts: scanJobs.attempts, businessId: scanJobs.businessId, businessName: businesses.name })
    .from(scanJobs).leftJoin(businesses, eq(businesses.id, scanJobs.businessId))
    .where(and(eq(scanJobs.scanId, id), eq(scanJobs.status, 'failed')))
  return Response.json({ jobs })
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const parsed = retryJobsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid retry request' }, { status: 400 })
  try {
    const result = await retryFailedJobs(await getDb(), id, 'jobId' in parsed.data ? parsed.data.jobId : undefined)
    startBackgroundWorker()
    return Response.json(result, { status: 202 })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'scan_not_found') return Response.json({ error: 'Scan not found' }, { status: 404 })
    if (code === 'job_not_failed' || code === 'dependent_task_running') return Response.json({ error: 'This task changed or dependent work is still running. Refresh and try again.' }, { status: 409 })
    throw error
  }
}
