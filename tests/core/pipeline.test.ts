import { describe, it, expect } from 'vitest'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { eq } from 'drizzle-orm'
import { createDb, type Db } from '@/db/client'
import { scans, businesses, domainCandidates } from '@/db/schema'
import { advanceScan, type PipelineDeps } from '@/core/pipeline'
import { ProviderError, type Provider } from '@/core/providers/provider'

async function freshDb(): Promise<Db> {
  const db = createDb(':memory:')
  await migrate(db, { migrationsFolder: 'drizzle' })
  return db
}

async function insertScan(db: Db, provider = 'mock') {
  await db.insert(scans).values({
    id: 'scan1', createdAt: new Date(), location: 'Ottawa, ON', category: 'bakery',
    countryCode: 'ca', provider,
  })
}

const PAGES = [
  { businesses: [
      { name: "Joe's Bakery", phone: '613-555-0101', rating: 4.6, reviewCount: 80 },          // no website → none
      { name: 'Crusty Loaf', website: 'https://alive.example.com', rating: 4.1, reviewCount: 33 },
    ], nextCursor: 'p2' },
  { businesses: [
      { name: 'Dead Site Bikes', website: 'https://dead.example.com', reviewCount: 5 },
    ], nextCursor: null },
]

function mockProvider(): Provider {
  return { id: 'mock', async fetchPage(_a, cursor) { return cursor === 'p2' ? PAGES[1] : PAGES[0] } }
}

function deps(db: Db, overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    db,
    getProviderById: () => mockProvider(),
    probe: async url => (url.includes('dead') ? 'dead' : 'alive'),
    checkDomain: async domain => domain === 'joesbakery.com',
    getApiKey: async () => undefined,
    batchSize: 2,
    ...overrides,
  }
}

async function runToCompletion(db: Db, d: PipelineDeps) {
  let res = await advanceScan('scan1', d)
  for (let i = 0; i < 20 && res.status === 'running'; i++) res = await advanceScan('scan1', d)
  return res
}

describe('pipeline', () => {
  it('happy path: fetches all pages, probes, checks domains, scores, completes', async () => {
    const db = await freshDb()
    await insertScan(db)
    const res = await runToCompletion(db, deps(db))
    expect(res.status).toBe('done')
    expect(res.totalFound).toBe(3)
    expect(res.totalProcessed).toBe(3)

    const biz = await db.select().from(businesses).where(eq(businesses.scanId, 'scan1'))
    const joe = biz.find(b => b.name === "Joe's Bakery")!
    expect(joe.presenceStatus).toBe('none')
    // none 40 + reviews 25 (80 capped) + rating 10 + exact domain 15 + phone 10 = 100
    expect(joe.score).toBe(100)
    expect(biz.find(b => b.name === 'Crusty Loaf')!.presenceStatus).toBe('alive')
    expect(biz.find(b => b.name === 'Dead Site Bikes')!.presenceStatus).toBe('dead')

    const joeCandidates = await db.select().from(domainCandidates).where(eq(domainCandidates.businessId, joe.id))
    expect(joeCandidates.some(c => c.domain === 'joesbakery.com' && c.available === true)).toBe(true)
  })

  it('resumes from persisted state across separate advance calls', async () => {
    const db = await freshDb()
    await insertScan(db)
    const d = deps(db)
    const first = await advanceScan('scan1', d)          // fetch page 1
    expect(first.status).toBe('running')
    expect(first.totalFound).toBe(2)
    const done = await runToCompletion(db, deps(db))     // fresh deps = "new process"
    expect(done.status).toBe('done')
    expect(done.totalFound).toBe(3)
  })

  it('recoverable provider error pauses the scan with a human message', async () => {
    const db = await freshDb()
    await insertScan(db)
    const quota: Provider = { id: 'mock', async fetchPage() { throw new ProviderError('Google free tier exhausted — resumes at midnight PT, or switch provider.', true) } }
    const res = await advanceScan('scan1', deps(db, { getProviderById: () => quota }))
    expect(res.status).toBe('paused')
    expect(res.errorMessage).toMatch(/free tier exhausted/)
  })

  it('non-recoverable provider error fails the scan', async () => {
    const db = await freshDb()
    await insertScan(db)
    const bad: Provider = { id: 'mock', async fetchPage() { throw new ProviderError('Bad API key.') } }
    const res = await advanceScan('scan1', deps(db, { getProviderById: () => bad }))
    expect(res.status).toBe('failed')
  })

  it('a business whose probe throws is marked probe_failed and retried once', async () => {
    const db = await freshDb()
    await insertScan(db)
    let attempts = 0
    const d = deps(db, {
      probe: async url => {
        if (url.includes('alive')) { attempts++; throw new Error('boom') }
        return 'dead'
      },
    })
    const res = await runToCompletion(db, d)
    expect(res.status).toBe('done')
    const crusty = (await db.select().from(businesses)).find(b => b.name === 'Crusty Loaf')!
    expect(crusty.presenceStatus).toBe('probe_failed')
    expect(crusty.retried).toBe(true)
    expect(crusty.score).toBe(0)
    expect(attempts).toBe(2) // initial + one retry
  })
})
