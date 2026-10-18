import { describe, it, expect } from 'vitest'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { eq } from 'drizzle-orm'
import { createDb, type Db } from '@/db/client'
import { scans, businesses, domainCandidates } from '@/db/schema'
import { advanceScan, type PipelineDeps, type SecretName } from '@/core/pipeline'
import { ProviderError, type Provider } from '@/core/providers/provider'
import type { ProviderConfig, ScanArea } from '@/core/types'

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
    probe: async url => ({ status: url.includes('dead') ? 'dead' as const : 'alive' as const, detail: 'test' }),
    checkDomain: async domain => domain === 'joesbakery.com',
    getSecret: async () => undefined,
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
    // unverified 15 + reviews 25 + rating 10 + exact domain 15 + phone 10 = 75
    expect(joe.score).toBe(75)
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

  it('a recoverable error carrying nextCursor persists it as the paused providerCursor (e.g. Apify poll-cap resume)', async () => {
    const db = await freshDb()
    await insertScan(db)
    const stuck: Provider = {
      id: 'mock',
      async fetchPage() { throw new ProviderError('Run still in progress — resume the scan to keep waiting.', true, 'apify:RUN123:1') },
    }
    const res = await advanceScan('scan1', deps(db, { getProviderById: () => stuck }))
    expect(res.status).toBe('paused')
    const row = (await db.select().from(scans).where(eq(scans.id, 'scan1')))[0]
    expect(row.providerCursor).toBe('apify:RUN123:1')
  })

  it('a recoverable error without nextCursor leaves the existing providerCursor unchanged', async () => {
    const db = await freshDb()
    await insertScan(db)
    // Prime the cursor via a normal running page first, then hit a recoverable error with no nextCursor.
    let calls = 0
    const flaky: Provider = {
      id: 'mock',
      async fetchPage() {
        calls++
        if (calls === 1) return { businesses: [], nextCursor: 'apify:RUN123:5' }
        throw new ProviderError('Apify is rate-limiting — the scan will resume.', true)
      },
    }
    const d = deps(db, { getProviderById: () => flaky })
    await advanceScan('scan1', d)
    const res = await advanceScan('scan1', d)
    expect(res.status).toBe('paused')
    const row = (await db.select().from(scans).where(eq(scans.id, 'scan1')))[0]
    expect(row.providerCursor).toBe('apify:RUN123:5')
  })

  it('a business whose probe throws is marked probe_failed and retried once', async () => {
    const db = await freshDb()
    await insertScan(db)
    let attempts = 0
    const d = deps(db, {
      probe: async url => {
        if (url.includes('alive')) { attempts++; throw new Error('boom') }
        return { status: 'dead' as const, detail: 'test' }
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

  function noPhoneProvider(): Provider {
    return {
      id: 'mock',
      async fetchPage() {
        return { businesses: [{ name: 'No Phone Bakery', reviewCount: 10 }], nextCursor: null }
      },
    }
  }

  it('backfills a phone-less business via enrichPhone and scores it as having a phone', async () => {
    const db = await freshDb()
    await insertScan(db)
    let calls = 0
    const enrichPhone = async (name: string, _address: string | null) => {
      calls++
      expect(name).toBe('No Phone Bakery')
      return '613-555-9999'
    }
    const res = await runToCompletion(db, deps(db, { getProviderById: noPhoneProvider, enrichPhone }))
    expect(res.status).toBe('done')
    expect(calls).toBe(1)
    const biz = (await db.select().from(businesses).where(eq(businesses.scanId, 'scan1')))[0]
    expect(biz.phone).toBe('613-555-9999')

    // Same scenario but the lookup finds nothing — phone stays null and score is lower
    // by exactly the hasPhone weight, proving hasPhone tracks the enriched phone.
    const db2 = await freshDb()
    await insertScan(db2)
    const res2 = await runToCompletion(db2, deps(db2, { getProviderById: noPhoneProvider, enrichPhone: async () => null }))
    expect(res2.status).toBe('done')
    const biz2 = (await db2.select().from(businesses).where(eq(businesses.scanId, 'scan1')))[0]
    expect(biz2.phone).toBeNull()
    expect(biz.score).toBeGreaterThan(biz2.score!)
  })

  it('an enrichPhone that throws is swallowed: business still scored phone-less, not probe_failed', async () => {
    const db = await freshDb()
    await insertScan(db)
    const enrichPhone = async () => { throw new Error('lookup service down') }
    const res = await runToCompletion(db, deps(db, { getProviderById: noPhoneProvider, enrichPhone }))
    expect(res.status).toBe('done')
    const biz = (await db.select().from(businesses).where(eq(businesses.scanId, 'scan1')))[0]
    expect(biz.presenceStatus).toBe('none') // real probe result (no listed website), not probe_failed
    expect(biz.phone).toBeNull()
    expect(biz.score).toBeLessThan(100) // scored without the hasPhone bonus
  })

  it('a getSecret that throws does not propagate out of advanceScan and the scan still resolves', async () => {
    const db = await freshDb()
    await insertScan(db)
    const getSecret = async (): Promise<string | undefined> => { throw new Error('db unavailable') }
    const res = await runToCompletion(db, deps(db, { getProviderById: noPhoneProvider, getSecret }))
    expect(res).toBeDefined()
    expect(res.status).toBe('done') // resolves gracefully as if no key configured
    const biz = (await db.select().from(businesses).where(eq(businesses.scanId, 'scan1')))[0]
    expect(biz.phone).toBeNull()
  })

  it('with no configured API key, a phone-less business is left unchanged (default behavior preserved)', async () => {
    const savedKey = process.env.GOOGLE_PLACES_API_KEY
    delete process.env.GOOGLE_PLACES_API_KEY
    try {
      const db = await freshDb()
      await insertScan(db)
      // Deliberately omit getSecret and enrichPhone to exercise the real pipeline defaults:
      // no key configured anywhere -> default enrichPhone is a no-op that always returns null.
      const d: PipelineDeps = {
        db, getProviderById: noPhoneProvider,
        probe: async () => ({ status: 'dead' as const, detail: 'test' }), checkDomain: async () => false, batchSize: 2,
      }
      const res = await runToCompletion(db, d)
      expect(res.status).toBe('done')
      const biz = (await db.select().from(businesses).where(eq(businesses.scanId, 'scan1')))[0]
      expect(biz.phone).toBeNull()
    } finally {
      if (savedKey !== undefined) process.env.GOOGLE_PLACES_API_KEY = savedKey
    }
  })

  it('passes the apify token to the provider config and never persists it', async () => {
    const db = createDb(':memory:')
    await migrate(db, { migrationsFolder: 'drizzle' })
    await db.insert(scans).values({
      id: 's-apify', createdAt: new Date(), location: 'Ottawa, ON', category: 'bakery',
      countryCode: 'ca', provider: 'fake-apify', providerConfig: JSON.stringify({ maxPlaces: 25 }),
    })
    let seen: ProviderConfig | null = null
    const provider = {
      id: 'fake-apify',
      fetchPage: async (_a: ScanArea, _c: string | null, config: ProviderConfig) => {
        seen = config
        return { businesses: [], nextCursor: null }
      },
    }
    await advanceScan('s-apify', {
      db,
      getProviderById: () => provider,
      getSecret: async (n: SecretName) => (n === 'apify_token' ? 'tok-secret' : undefined),
    })
    expect(seen!.apifyToken).toBe('tok-secret')
    expect(seen!.maxPlaces).toBe(25)
    const row = (await db.select().from(scans).where(eq(scans.id, 's-apify')))[0]
    expect(row.providerConfig ?? '').not.toContain('tok-secret')
  })

  it('stores the probe detail, and a reason for none and probe_failed', async () => {
    const db = createDb(':memory:')
    await migrate(db, { migrationsFolder: 'drizzle' })
    await db.insert(scans).values({
      id: 'pd1', createdAt: new Date(), location: 'Ottawa, ON', category: 'bakery',
      countryCode: 'ca', provider: 'fake', phase: 'process',
    })
    await db.insert(businesses).values([
      { id: 'p1', scanId: 'pd1', name: 'Dead Co', listedWebsite: 'http://dead.example' },
      { id: 'p2', scanId: 'pd1', name: 'No Site Co' },
      { id: 'p3', scanId: 'pd1', name: 'Boom Co', listedWebsite: 'http://boom.example' },
    ])
    await advanceScan('pd1', {
      db,
      getProviderById: () => ({ id: 'fake', fetchPage: async () => ({ businesses: [], nextCursor: null }) }),
      probe: async url => {
        if (url.includes('boom')) throw new Error('probe exploded')
        return { status: 'dead' as const, detail: 'Returned HTTP 503.' }
      },
      checkDomain: async () => false,
      getSecret: async () => undefined,
      batchSize: 10,
    })
    const rows = await db.select().from(businesses).where(eq(businesses.scanId, 'pd1'))
    const byId = new Map(rows.map(r => [r.id, r]))
    expect(byId.get('p1')!.presenceStatus).toBe('dead')
    expect(byId.get('p1')!.probeDetail).toBe('Returned HTTP 503.')
    expect(byId.get('p2')!.presenceStatus).toBe('none')
    expect(byId.get('p2')!.probeDetail).toMatch(/No website was listed/)
    expect(byId.get('p3')!.presenceStatus).toBe('probe_failed')
    expect(byId.get('p3')!.probeDetail).toMatch(/^The check itself failed\.$/)
  })
})


describe('website discovery in the pipeline', () => {
  it('discovers and probes missing websites before scoring, leaving supplied sites alone', async () => {
    const db = await freshDb()
    await insertScan(db)
    const lookedUp: string[] = []
    await runToCompletion(db, deps(db, {
      discoverWebsite: async input => {
        lookedUp.push(input.name)
        return { website: 'https://joes.example', detail: 'Discovered via search.' }
      },
    }))
    expect(lookedUp).toEqual(["Joe's Bakery"])
    const joe = (await db.select().from(businesses)).find(b => b.name === "Joe's Bakery")!
    expect(joe.listedWebsite).toBe('https://joes.example')
    expect(joe.presenceStatus).toBe('alive')
    expect(joe.score).toBe(0)
    expect(joe.probeDetail).toContain('Discovered via search')
    expect(await db.select().from(domainCandidates).where(eq(domainCandidates.businessId, joe.id))).toHaveLength(0)
  })

  it('keeps an inconclusive search unverified and completes despite a search failure', async () => {
    for (const fails of [false, true]) {
      const db = await freshDb()
      await insertScan(db)
      const result = await runToCompletion(db, deps(db, {
        discoverWebsite: async () => {
          if (fails) throw new Error('offline')
          return { website: null, detail: 'No unambiguous match.' }
        },
      }))
      expect(result.status).toBe('done')
      const joe = (await db.select().from(businesses)).find(b => b.name === "Joe's Bakery")!
      expect(joe.presenceStatus).toBe('none')
      expect(joe.probeDetail).toContain('unverified')
    }
  })
})

it('treats Facebook as a separate lead and still searches for an independent site', async () => {
  for (const discoveryOutcome of ['disabled', 'missing', 'failed', 'found'] as const) {
    const db = await freshDb()
    await insertScan(db)
    const facebook = 'https://www.facebook.com/restaurant'
    let searched = 0
    const probed: string[] = []
    await runToCompletion(db, deps(db, {
      getProviderById: () => ({ id: 'mock', fetchPage: async () => ({
        businesses: [{ name: 'Restaurant', website: facebook, address: 'Rue du Test 1, 6000 Charleroi', phone: '123' }], nextCursor: null,
      }) }),
      discoverWebsite: discoveryOutcome === 'disabled' ? undefined : async () => {
        searched++
        if (discoveryOutcome === 'failed') throw new Error('offline')
        return { website: discoveryOutcome === 'found' ? 'https://restaurant.example' : null, detail: 'Search result.' }
      },
      probe: async url => { probed.push(url); return { status: 'alive', detail: 'Responded normally.' } },
    }))
    const row = (await db.select().from(businesses))[0]
    expect(searched).toBe(discoveryOutcome === 'disabled' ? 0 : 1)
    if (discoveryOutcome === 'found') {
      expect(row.presenceStatus).toBe('alive')
      expect(row.score).toBe(0)
      expect(row.listedWebsite).toBe('https://restaurant.example')
      expect(probed).toEqual(['https://restaurant.example'])
    } else {
      expect(row.presenceStatus).toBe('facebook')
      expect(row.score).toBe(35) // 25 presence + 10 phone
      expect(row.listedWebsite).toBe(facebook)
      expect(row.probeDetail).toContain('Facebook')
      expect(probed).toEqual([])
      expect((await db.select().from(domainCandidates)).length).toBeGreaterThan(0)
    }
  }
})

it('distinguishes a completed search finding nothing from an inconclusive search', async () => {
  for (const outcome of ['not_found', 'inconclusive'] as const) {
    const db = await freshDb()
    await insertScan(db)
    await runToCompletion(db, deps(db, {
      discoverWebsite: async () => ({ outcome, website: null, detail: 'Search completed.' }),
    }))
    const joe = (await db.select().from(businesses)).find(b => b.name === "Joe's Bakery")!
    expect(joe.presenceStatus).toBe(outcome === 'not_found' ? 'not_found' : 'none')
    expect(joe.score).toBe(outcome === 'not_found' ? 100 : 75)
  }
})

it('ranks no listed site or Facebook above source Facebook with identical lead signals', async () => {
  for (const website of [undefined, 'https://www.facebook.com/restaurant', 'https://restaurant.example']) {
    const db = await freshDb()
    await insertScan(db)
    await runToCompletion(db, deps(db, {
      getProviderById: () => ({ id: 'mock', fetchPage: async () => ({
        businesses: [{ name: 'Restaurant', website }], nextCursor: null,
      }) }),
      discoverWebsite: async () => ({ outcome: 'not_found', website: null, detail: 'Only directories or social results.' }),
      checkDomain: async () => false,
    }))
    const row = (await db.select().from(businesses))[0]
    expect(row.presenceStatus).toBe(!website ? 'not_found' : website.includes('facebook') ? 'facebook' : 'alive')
    expect(row.score).toBe(!website ? 40 : website.includes('facebook') ? 25 : 0)
  }
})

it('does not lower lead potential for a search-discovered URL redirecting to Facebook', async () => {
  const db = await freshDb()
  await insertScan(db)
  await runToCompletion(db, deps(db, {
    getProviderById: () => ({ id: 'mock', fetchPage: async () => ({ businesses: [{ name: 'Restaurant' }], nextCursor: null }) }),
    discoverWebsite: async () => ({ outcome: 'matched', website: 'https://restaurant.example', detail: 'Search match.' }),
    probe: async () => ({ status: 'facebook', detail: 'Redirected to Facebook.' }),
    checkDomain: async () => false,
  }))
  const row = (await db.select().from(businesses))[0]
  expect(row.presenceStatus).toBe('not_found')
  expect(row.listedWebsite).toBeNull()
  expect(row.score).toBe(40)
})

it('preserves Facebook and source links when an independent website is discovered', async () => {
  const db = await freshDb()
  await insertScan(db)
  await runToCompletion(db, deps(db, {
    getProviderById: () => ({ id: 'mock', fetchPage: async () => ({
      businesses: [{ name: 'Restaurant', website: 'https://facebook.com/restaurant', facebookUrl: 'https://facebook.com/restaurant', sourceUrl: 'https://www.openstreetmap.org/node/123' }],
      nextCursor: null,
    }) }),
    discoverWebsite: async () => ({ outcome: 'matched', website: 'https://restaurant.example', detail: 'Matched.' }),
  }))
  const row = (await db.select().from(businesses))[0]
  expect(row).toMatchObject({
    listedWebsite: 'https://restaurant.example', facebookUrl: 'https://facebook.com/restaurant',
    sourceUrl: 'https://www.openstreetmap.org/node/123', presenceStatus: 'alive',
  })
})

it('saves partial batch progress on a search block and resumes without recounting leads', async () => {
  const db = await freshDb()
  await insertScan(db)
  await db.update(scans).set({ phase: 'process', totalFound: 2 })
  await db.insert(businesses).values([
    { id: 'first', scanId: 'scan1', name: 'First', address: '1 Main Street' },
    { id: 'second', scanId: 'scan1', name: 'Second', address: '2 Main Street' },
  ])
  let blocked = true
  const names: string[] = []
  const d = deps(db, { discoverWebsite: async input => {
    names.push(input.name)
    return { website: null, outcome: 'not_found', detail: 'Search',
      ...(input.name === 'Second' && blocked ? { retryAfterMs: 300000 } : {}) }
  } })
  const paused = await advanceScan('scan1', d)
  expect(paused.status).toBe('paused')
  expect(paused.totalProcessed).toBe(1)
  expect(paused.errorMessage).toContain('Progress is saved')
  const pending = (await db.select().from(businesses).where(eq(businesses.id, 'second')))[0]
  expect(pending.presenceStatus).toBeNull()
  blocked = false
  const done = await runToCompletion(db, d)
  expect(done.status).toBe('done')
  expect(done.totalProcessed).toBe(2)
  expect(names).toEqual(['First', 'Second', 'Second'])
})
