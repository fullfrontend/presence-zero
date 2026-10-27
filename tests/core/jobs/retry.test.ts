import { expect, it } from 'vitest'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { eq } from 'drizzle-orm'
import { createDb } from '@/db/client'
import { businesses, scanJobs, scans } from '@/db/schema'
import { retryFailedJobs } from '@/core/jobs/retry'
import { claimJob, stageRows } from '@/core/jobs/queue'
import { processJob } from '@/core/jobs/process'
async function setup() {
  const db = createDb(':memory:')
  await migrate(db, { migrationsFolder: 'drizzle' })
  await db.insert(scans).values({ id: 's', createdAt: new Date(), location: 'Test', category: 'Test', provider: 'csv', status: 'done' })
  await db.insert(businesses).values({ id: 'b', scanId: 's', name: 'Business', auditReport: { status: 'failed' } as any })
  for (const row of stageRows('s', 'b', true)) await db.insert(scanJobs).values({ id: row.id, scanId: 's', businessId: 'b', kind: row.kind, status: 'done' })
  await db.update(scanJobs).set({ status: 'failed', attempts: 2, error: 'Audit failed' }).where(eq(scanJobs.kind, 'audit'))
  return db
}
it('reopens a completed scan, clears failed audit output and really executes its retry', async () => {
  const db = await setup()
  expect(await retryFailedJobs(db, 's', 'b:audit')).toEqual({ retried: 1, paused: false })
  expect((await db.select().from(businesses))[0].auditReport).toBeNull()
  const job = (await claimJob(db, 'audit', 1))!
  expect(job.attempts).toBe(1)
  let called = false
  await processJob(job, { db, auditLead: async () => { called = true; return { status: 'complete' } as any } })
  expect(called).toBe(true)
  expect((await db.select().from(scanJobs).where(eq(scanJobs.kind, 'audit')))[0].status).toBe('done')
  expect((await db.select().from(scanJobs).where(eq(scanJobs.kind, 'search')))[0].status).toBe('done')
  db.$client.close()
})
it('retries all failures and refreshes only dependent work, preserving the recovery marker', async () => {
  const db = await setup()
  await db.update(scanJobs).set({ status: 'failed', result: 'recover_website' }).where(eq(scanJobs.kind, 'search'))
  expect((await retryFailedJobs(db, 's')).retried).toBe(2)
  const jobs = await db.select().from(scanJobs)
  expect(jobs.find(j => j.kind === 'search')).toMatchObject({ status: 'pending', result: 'recover_website', attempts: 0 })
  expect(jobs.find(j => j.kind === 'probe')?.status).toBe('pending')
  expect(jobs.find(j => j.kind === 'phone')?.status).toBe('done')
  expect(await claimJob(db, 'audit', 1)).toBeUndefined()
  db.$client.close()
})
it('does not duplicate an individual retry or target another scan', async () => {
  const db = await setup()
  await expect(retryFailedJobs(db, 'missing', 'b:audit')).rejects.toThrow('scan_not_found')
  await expect(retryFailedJobs(db, 's', 'other:audit')).rejects.toThrow('job_not_failed')
  await retryFailedJobs(db, 's', 'b:audit')
  await expect(retryFailedJobs(db, 's', 'b:audit')).rejects.toThrow('job_not_failed')
  expect((await retryFailedJobs(db, 's')).retried).toBe(0)
  db.$client.close()
})
it('preserves a user pause and keeps retried work queued', async () => {
  const db = await setup()
  await db.update(scans).set({ status: 'paused', errorMessage: 'Paused by you.' })
  expect((await retryFailedJobs(db, 's')).paused).toBe(true)
  expect(await claimJob(db, 'audit', 1)).toBeUndefined()
  expect((await db.select().from(scans))[0]).toMatchObject({ status: 'paused', errorMessage: 'Paused by you.' })
  db.$client.close()
})
it('rolls back the whole request if dependent work is running', async () => {
  const db = await setup()
  await db.update(scanJobs).set({ status: 'failed' }).where(eq(scanJobs.kind, 'search'))
  await db.update(scanJobs).set({ status: 'running', owner: 'worker', leaseUntil: Date.now() + 60000 }).where(eq(scanJobs.kind, 'probe'))
  await expect(retryFailedJobs(db, 's')).rejects.toThrow('dependent_task_running')
  expect((await db.select().from(scanJobs).where(eq(scanJobs.kind, 'audit')))[0].status).toBe('failed')
  expect((await db.select().from(scans))[0].status).toBe('done')
  db.$client.close()
})
it('retries collection from its saved cursor without touching completed businesses', async () => {
  const db = await setup()
  await db.update(scans).set({ status: 'failed', providerCursor: 'page2' })
  await db.insert(scanJobs).values({ id: 's:collect', scanId: 's', kind: 'collect', status: 'failed', attempts: 2 })
  await retryFailedJobs(db, 's', 's:collect')
  expect((await db.select().from(scans))[0]).toMatchObject({ status: 'running', phase: 'fetch', providerCursor: 'page2' })
  expect(await claimJob(db, 'collect', 1)).toBeDefined()
  expect((await db.select().from(scanJobs).where(eq(scanJobs.kind, 'phone')))[0].status).toBe('done')
  db.$client.close()
})

it('allows only one concurrent retry to reset the same failed task', async () => {
  const db = await setup()
  const outcomes = await Promise.allSettled([retryFailedJobs(db, 's', 'b:audit'), retryFailedJobs(db, 's', 'b:audit')])
  expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect((await db.select().from(scanJobs).where(eq(scanJobs.kind, 'audit')))[0]).toMatchObject({ status: 'pending', attempts: 0 })
  db.$client.close()
})
