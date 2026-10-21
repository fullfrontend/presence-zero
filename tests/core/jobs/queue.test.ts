import { expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb } from '@/db/client'
import { businesses, scanJobs, scans, domainCandidates } from '@/db/schema'
import { claimJob, ensureScanJobs, JOB_KINDS, LEASE_MS, refreshScanProgress } from '@/core/jobs/queue'
import { processJob } from '@/core/jobs/process'
import { createWebsiteProbe } from '@/core/probes/website-probe'
import type { PipelineDeps } from '@/core/pipeline'

async function setup(overrides: Partial<PipelineDeps> = {}) {
  const db = createDb(':memory:')
  await migrate(db, { migrationsFolder: 'drizzle' })
  await db.insert(scans).values({ id: 'scan', createdAt: new Date(), location: 'Charleroi', category: 'bakery', countryCode: 'be', provider: 'test' })
  const deps: PipelineDeps = { db, getSecret: async () => undefined,
    getProviderById: () => ({ id: 'test', async fetchPage(_area, cursor) {
      return { businesses: [{ name: cursor ? 'Second' : 'First', address: '12 Rue Test, Charleroi' }], nextCursor: cursor ? null : 'page2' }
    } }),
    probe: async () => ({ status: 'alive', detail: 'OK' }), checkDomain: async () => true, enrichPhone: async () => null, ...overrides }
  await ensureScanJobs(db, 'scan')
  return { db, deps }
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { resolve, promise } }

it('collects and exposes the next page while a previous search is unresolved', async () => {
  const search = deferred<{ website: null; outcome: 'not_found'; detail: string }>()
  const { db, deps } = await setup({ discoverWebsite: () => search.promise })
  await processJob((await claimJob(db, 'collect', 1))!, deps)
  const searchJob = (await claimJob(db, 'search', 1))!
  const searching = processJob(searchJob, deps)
  await processJob((await claimJob(db, 'collect', 1))!, deps)
  expect(await db.select().from(businesses)).toHaveLength(2)
  expect((await db.select().from(scans))[0]).toMatchObject({ totalFound: 2, totalProcessed: 0, phase: 'process' })
  expect((await db.select().from(scanJobs).where(eq(scanJobs.id, searchJob.id)))[0].status).toBe('running')
  // Another stage can run despite the search; the probe for this business must wait.
  expect(await claimJob(db, 'phone', 2)).toBeDefined()
  expect(await claimJob(db, 'probe', 4)).toBeUndefined()
  search.resolve({ website: null, outcome: 'not_found', detail: 'No match' })
  await searching
  expect(await claimJob(db, 'probe', 4)).toBeDefined()
})

it('atomically limits concurrent claims and fences writes from an expired worker', async () => {
  const { db, deps } = await setup()
  await processJob((await claimJob(db, 'collect', 1, 1000))!, deps, () => 1000)
  const [first, second] = await Promise.all([claimJob(db, 'search', 1, 1000), claimJob(db, 'search', 1, 1000)])
  expect([first, second].filter(Boolean)).toHaveLength(1)
  const old = (first ?? second)!
  const recovered = (await claimJob(db, 'search', 1, 1000 + LEASE_MS))!
  expect(recovered.owner).not.toBe(old.owner)
  await processJob(old, { ...deps, discoverWebsite: async () => ({ website: 'https://stale.example', detail: 'stale' }) }, () => 1000 + LEASE_MS)
  expect((await db.select().from(businesses))[0].listedWebsite).toBeNull()
  await processJob(recovered, { ...deps, discoverWebsite: async () => ({ website: 'https://fresh.example', detail: 'fresh' }) }, () => 1000 + LEASE_MS)
  expect((await db.select().from(businesses))[0].listedWebsite).toBe('https://fresh.example')
})

it('defers rate-limited searches without pausing collection or consuming a throttle-only retry', async () => {
  const { db, deps } = await setup({ discoverWebsite: async () => ({ website: null, retryAfterMs: 300000, deferred: true, detail: 'wait' }) })
  await processJob((await claimJob(db, 'collect', 1, 1000))!, deps, () => 1000)
  const job = (await claimJob(db, 'search', 1, 1000))!
  await processJob(job, deps, () => 1000)
  expect((await db.select().from(scanJobs).where(eq(scanJobs.id, job.id)))[0]).toMatchObject({ status: 'pending', attempts: 0, availableAt: 301000 })
  expect((await db.select().from(scans))[0].status).toBe('running')
  expect(await claimJob(db, 'collect', 1, 1000)).toBeDefined()
  expect(await claimJob(db, 'search', 1, 300999)).toBeUndefined()
})

it('finishes once every stage is terminal and does not duplicate domains on replay', async () => {
  const { db, deps } = await setup()
  for (let tick = 0; tick < 12; tick++) {
    for (const kind of JOB_KINDS) {
      const job = await claimJob(db, kind, 2)
      if (job) { await processJob(job, deps); await processJob(job, deps) }
    }
    await refreshScanProgress(db, 'scan')
  }
  expect((await db.select().from(scans))[0]).toMatchObject({ status: 'done', totalFound: 2, totalProcessed: 2 })
  const domains = await db.select().from(domainCandidates)
  expect(new Set(domains.map(d => d.id)).size).toBe(domains.length)
  expect((await db.select().from(businesses)).every(b => b.score !== null)).toBe(true)
})

it('respects a user pause without discarding in-flight work', async () => {
  const { db, deps } = await setup()
  const collect = (await claimJob(db, 'collect', 1))!
  await db.update(scans).set({ status: 'paused', errorMessage: 'Paused by you.' })
  await processJob(collect, deps)
  await refreshScanProgress(db, 'scan')
  expect((await db.select().from(scans))[0]).toMatchObject({ status: 'paused', errorMessage: 'Paused by you.', totalFound: 1 })
  for (const kind of JOB_KINDS) expect(await claimJob(db, kind, 4)).toBeUndefined()
})

it('continues collecting and checking prospects while an Ollama audit is unresolved', async () => {
  const audit = deferred<never>()
  const auditLead = vi.fn(() => audit.promise)
  const { db, deps } = await setup({ auditLead })
  await processJob((await claimJob(db, 'collect', 1))!, deps)
  for (const kind of ['search', 'probe', 'phone'] as const) await processJob((await claimJob(db, kind, 1))!, deps)
  const auditJob = (await claimJob(db, 'audit', 1))!
  // Use a rejecting promise to finish the test after proving independence.
  let finish!: () => void
  const auditing = processJob(auditJob, { ...deps, auditLead: () => new Promise((_resolve, reject) => { finish = () => reject(new Error('test offline')) }) })
  await processJob((await claimJob(db, 'collect', 1))!, deps)
  for (const kind of ['search', 'probe', 'phone', 'domains'] as const) {
    const job = await claimJob(db, kind, 2)
    if (job) await processJob(job, deps)
  }
  expect(await db.select().from(businesses)).toHaveLength(2)
  expect((await db.select().from(businesses)).every(b => b.presenceStatus === 'none')).toBe(true)
  expect(await claimJob(db, 'audit', 1)).toBeUndefined()
  expect((await db.select().from(scanJobs).where(eq(scanJobs.id, auditJob.id)))[0].status).toBe('running')
  finish()
  await auditing
})

it('limits exhausted search retries to that prospect and lets its other stages proceed', async () => {
  const { db, deps } = await setup({ discoverWebsite: async () => ({ website: null, retryAfterMs: 1000, detail: 'captcha' }) })
  await processJob((await claimJob(db, 'collect', 1, 1000))!, deps, () => 1000)
  for (const time of [1000, 2000, 3000]) await processJob((await claimJob(db, 'search', 1, time))!, deps, () => time)
  expect((await db.select().from(scanJobs)).find(j => j.kind === 'search')?.status).toBe('failed')
  expect((await db.select().from(scans))[0].status).toBe('running')
  expect(await claimJob(db, 'probe', 1, 3000)).toBeDefined()
  expect(await claimJob(db, 'collect', 1, 3000)).toBeDefined()
})

it.each([false, true])('ignores Facebook redirects only when the website came from search (discovered=%s)', async discovered => {
  const { db, deps } = await setup({
    getProviderById: () => ({ id: 'test', async fetchPage() { return { businesses: [{ name: 'Business', address: 'Charleroi', ...(discovered ? {} : { website: 'https://source.example' }) }], nextCursor: null } } }),
    discoverWebsite: async () => ({ website: 'https://discovered.example', outcome: 'matched', detail: 'match' }),
    probe: async () => ({ status: 'facebook', detail: 'redirect' }),
  })
  for (const kind of ['collect', 'search', 'probe'] as const) await processJob((await claimJob(db, kind, 1))!, deps)
  expect((await db.select().from(businesses))[0].presenceStatus).toBe(discovered ? 'not_found' : 'facebook')
})

it.each([[false, false], [true, false], [false, true], [true, true]])(
  'keeps the same lead score for unchanged evidence (search=%s, AI=%s)', async (searchEnabled, aiEnabled) => {
    const auditLead = vi.fn<NonNullable<PipelineDeps['auditLead']>>(async () => ({
      version: 1, status: 'complete', mode: 'profile', model: 'fixture', language: 'fr', createdAt: '2026-10-20T00:00:00Z',
      reason: null, verification: { status: 'not_applicable', detail: 'Profile only' }, summary: 'Research assistance',
      websiteQuality: null, opportunityScore: null, qualified: false, qualificationReasons: [], findings: [], brief: '', evidence: [],
    }))
    const discoverWebsite = vi.fn<NonNullable<PipelineDeps['discoverWebsite']>>(async () => ({ website: null, detail: 'Inconclusive' }))
    const { db, deps } = await setup({ discoverWebsite: searchEnabled ? discoverWebsite : undefined, auditLead: aiEnabled ? auditLead : undefined })
    for (let tick = 0; tick < 12; tick++) {
      for (const kind of JOB_KINDS) {
        const job = await claimJob(db, kind, 2)
        if (job) await processJob(job, deps)
      }
      await refreshScanProgress(db, 'scan')
    }
    const rows = await db.select().from(businesses)
    // Unverified need (40%) × (45 + domain readiness 5), regardless of enabled helpers.
    expect(rows.map(row => row.score)).toEqual([20, 20])
    expect(rows.every(row => row.presenceStatus === 'none')).toBe(true)
    expect(discoverWebsite).toHaveBeenCalledTimes(searchEnabled ? 2 : 0)
    expect(auditLead).toHaveBeenCalledTimes(aiEnabled ? 2 : 0)
    db.$client.close()
  },
)

it('uses verified website improvement potential weighted by commercial signals', async () => {
  const { db, deps } = await setup({
    getProviderById: () => ({ id: 'test', async fetchPage() {
      return { businesses: [{ name: 'Website business', website: 'https://example.test' }], nextCursor: null }
    } }),
    auditLead: async () => ({
      version: 1, status: 'complete', mode: 'website', model: 'fixture', language: 'fr', createdAt: '2026-10-20T00:00:00Z',
      reason: null, verification: { status: 'matched', detail: 'Matching business' }, summary: 'Improvements suggested',
      websiteQuality: 1, opportunityScore: 99, qualified: true, qualificationReasons: [], findings: [], brief: '', evidence: [],
    }),
  })
  for (const kind of JOB_KINDS) {
    const job = await claimJob(db, kind, 1)
    if (job) await processJob(job, deps)
  }
  await refreshScanProgress(db, 'scan')
  expect((await db.select().from(businesses))[0]).toMatchObject({
    presenceStatus: 'alive', score: 50, auditReport: { opportunityScore: 99 },
  })
  db.$client.close()
})

it.each([
  ['alive', null], ['dead', 92], ['parked', 87],
] as const)('scores a search-discovered %s website exactly like a source-listed website', async (presence, expectedScore) => {
  const scores: number[] = []
  for (const discovered of [false, true]) {
    const probe = vi.fn<NonNullable<PipelineDeps['probe']>>(async () => ({ status: presence, detail: 'Website checked' }))
    const { db, deps } = await setup({
      getProviderById: () => ({ id: 'test', async fetchPage() {
        return { businesses: [{ name: 'Business', phone: '+32 12345678', rating: 5, reviewCount: 50,
          website: discovered ? undefined : 'https://business.example' }], nextCursor: null }
      } }),
      discoverWebsite: async () => ({ website: 'https://business.example', outcome: 'matched', detail: 'Matching website found' }),
      probe,
    })
    for (const kind of JOB_KINDS) {
      const job = await claimJob(db, kind, 1)
      if (job) await processJob(job, deps)
    }
    await refreshScanProgress(db, 'scan')
    const row = (await db.select().from(businesses))[0]
    expect(probe).toHaveBeenCalledWith('https://business.example')
    expect(row).toMatchObject({ listedWebsite: 'https://business.example', presenceStatus: presence, score: expectedScore })
    scores.push(row.score!)
    db.$client.close()
  }
  expect(scores[0]).toBe(scores[1])
})

it('persists a certificate configuration lead with a weighted repair score', async () => {
  const { db, deps } = await setup({
    getProviderById: () => ({ id: 'test', async fetchPage() {
      return { businesses: [{ name: 'Certificate fixture', website: 'https://certificate.example', phone: '123', rating: 5, reviewCount: 100 }], nextCursor: null }
    } }),
    probe: createWebsiteProbe({ lookup: async () => ['93.184.216.34'], fetchFn: async () => {
      throw new TypeError('fetch failed', { cause: Object.assign(new Error('TLS'), { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' }) })
    } }),
  })
  for (const kind of JOB_KINDS) {
    const job = await claimJob(db, kind, 1)
    if (job) await processJob(job, deps)
  }
  await refreshScanProgress(db, 'scan')
  const row = (await db.select().from(businesses))[0]
  expect(row).toMatchObject({ presenceStatus: 'configuration_error', score: 95, listedWebsite: 'https://certificate.example' })
  expect(row.probeDetail).toContain('HTTPS certificate validation failed (DEPTH_ZERO_SELF_SIGNED_CERT)')
  expect((await db.select().from(scans))[0].status).toBe('done')
  db.$client.close()
})
