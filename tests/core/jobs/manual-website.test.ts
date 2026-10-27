import { expect, it, vi } from 'vitest'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { eq } from 'drizzle-orm'
import { createDb } from '@/db/client'
import { businesses, scans, scanJobs } from '@/db/schema'
import { setManualWebsite } from '@/core/jobs/manual-website'
import { claimJob, refreshScanProgress, stageRows } from '@/core/jobs/queue'
import { processJob } from '@/core/jobs/process'
import type { PipelineDeps } from '@/core/pipeline'
async function setup() {
  const db = createDb(':memory:')
  await migrate(db, { migrationsFolder: 'drizzle' })
  await db.insert(scans).values({ id: 's', createdAt: new Date(), location: 'Test', category: 'Test', provider: 'csv', status: 'done', phase: 'done' })
  await db.insert(businesses).values({ id: 'b', scanId: 's', name: 'Business', sourceWebsite: 'https://old.example', listedWebsite: 'https://old.example', presenceStatus: 'dead', score: 90, auditReport: { status: 'failed' } as any })
  return db
}
const report = { version: 1, status: 'complete', mode: 'website', model: 'fixture', language: 'fr-FR', createdAt: '2026-10-27T00:00:00Z', reason: null, verification: { status: 'matched', detail: 'Identity matched' }, summary: 'New site', websiteQuality: 80, opportunityScore: 20, qualified: false, qualificationReasons: [], findings: [], brief: '', evidence: [] } as const
it('adds a manual website to a historical scan and automatically probes, audits and scores it', async () => {
  const db = await setup()
  await setManualWebsite(db, 'b', 'https://new.example/')
  expect((await db.select().from(businesses))[0]).toMatchObject({ sourceWebsite: 'https://old.example', listedWebsite: 'https://new.example/', presenceStatus: null, score: null, auditReport: null })
  expect(await claimJob(db, 'audit', 1)).toBeUndefined()
  const auditLead = vi.fn<NonNullable<PipelineDeps['auditLead']>>(async () => ({ ...report, qualificationReasons: [], findings: [], evidence: [] }))
  const deps: PipelineDeps = { db, probe: async () => ({ status: 'alive', detail: 'OK' }), auditLead }
  await processJob((await claimJob(db, 'probe', 1))!, deps)
  await processJob((await claimJob(db, 'audit', 1))!, deps)
  await processJob((await claimJob(db, 'domains', 1))!, deps)
  await refreshScanProgress(db, 's')
  expect(auditLead).toHaveBeenCalledWith(expect.objectContaining({ website: 'https://new.example/', presence: 'alive' }))
  expect((await db.select().from(businesses))[0]).toMatchObject({ presenceStatus: 'alive', score: 10, auditReport: { summary: 'New site' } })
  expect((await db.select().from(scans))[0].status).toBe('done')
  db.$client.close()
})
it('fences out an in-flight audit when the user replaces the website', async () => {
  const db = await setup()
  await db.update(scans).set({ status: 'running' })
  await db.update(businesses).set({ auditReport: null })
  for (const stage of stageRows('s', 'b')) await db.insert(scanJobs).values({ id: stage.id, scanId: 's', businessId: 'b', kind: stage.kind, status: stage.kind === 'audit' ? 'pending' : 'done' })
  let finish!: (value: any) => void
  const audit = new Promise<any>(resolve => { finish = resolve })
  let started!: () => void
  const start = new Promise<void>(resolve => { started = resolve })
  const oldJob = (await claimJob(db, 'audit', 1))!
  const running = processJob(oldJob, { db, auditLead: () => { started(); return audit } })
  await start
  await setManualWebsite(db, 'b', 'https://new.example')
  finish({ ...report, summary: 'STALE' })
  await running
  expect((await db.select().from(businesses))[0]).toMatchObject({ listedWebsite: 'https://new.example', auditReport: null })
  expect((await db.select().from(scanJobs).where(eq(scanJobs.kind, 'audit')))[0]).toMatchObject({ status: 'pending', owner: null, attempts: 0 })
  db.$client.close()
})
it('respects disabled AI and never automatically replaces a manual URL through search', async () => {
  const db = await setup()
  await setManualWebsite(db, 'b', 'https://old.example')
  const search = vi.fn()
  await processJob((await claimJob(db, 'probe', 1))!, { db, discoverWebsite: search, probe: async () => ({ status: 'configuration_error', detail: 'TLS' }) })
  expect(await claimJob(db, 'search', 1)).toBeUndefined()
  await processJob((await claimJob(db, 'audit', 1))!, { db })
  expect(search).not.toHaveBeenCalled()
  expect((await db.select().from(businesses))[0].auditReport).toBeNull()
  db.$client.close()
})
it('keeps user-paused scans paused and returns not found without new jobs', async () => {
  const db = await setup()
  expect(await setManualWebsite(db, 'unknown', 'https://new.example')).toBeNull()
  await db.update(scans).set({ status: 'paused', errorMessage: 'Paused by you.' })
  expect((await setManualWebsite(db, 'b', 'https://new.example'))?.paused).toBe(true)
  expect(await claimJob(db, 'probe', 1)).toBeUndefined()
  db.$client.close()
})
