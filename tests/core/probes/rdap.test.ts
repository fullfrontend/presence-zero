import { describe, it, expect, vi } from 'vitest'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createRdapChecker, AVAILABLE_TTL_MS, type RdapCacheStore } from '@/core/probes/rdap'
import { createDrizzleRdapCache } from '@/core/probes/rdap-cache-store'
import { createDb } from '@/db/client'

function memCache(): RdapCacheStore & { store: Map<string, { available: boolean; checkedAt: Date }> } {
  const store = new Map()
  return {
    store,
    async get(d) { return store.get(d) ?? null },
    async set(d, available, checkedAt) { store.set(d, { available, checkedAt }) },
  }
}
function registryResponse(body: string, init: ResponseInit) {
  const response = new Response(body, init)
  Object.defineProperties(response, { url: { value: 'https://registry.example/domain/test' }, redirected: { value: true } })
  return response
}
const noSleep = async () => {}

describe('rdap checker', () => {
  it('404 means available and is cached', async () => {
    const cache = memCache()
    const fetchFn = vi.fn(async () => registryResponse('', { status: 404 })) as unknown as typeof fetch
    const check = createRdapChecker({ cache, fetchFn, sleep: noSleep })
    expect(await check('free.com')).toBe(true)
    expect(cache.store.get('free.com')!.available).toBe(true)
  })

  it('200 means taken', async () => {
    const check = createRdapChecker({
      cache: memCache(), sleep: noSleep,
      fetchFn: (async () => new Response('{}', { status: 200 })) as typeof fetch,
    })
    expect(await check('taken.com')).toBe(false)
  })

  it('serves fresh cache without fetching', async () => {
    const cache = memCache()
    const now = new Date('2026-07-15T12:00:00Z')
    cache.store.set('cached.com', { available: true, checkedAt: new Date(now.getTime() - AVAILABLE_TTL_MS / 2) })
    const fetchFn = vi.fn() as unknown as typeof fetch
    const check = createRdapChecker({ cache, fetchFn, now: () => now, sleep: noSleep })
    expect(await check('cached.com')).toBe(true)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('re-fetches when cache is stale', async () => {
    const cache = memCache()
    const now = new Date('2026-07-15T12:00:00Z')
    cache.store.set('stale.com', { available: true, checkedAt: new Date(now.getTime() - AVAILABLE_TTL_MS * 2) })
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch
    const check = createRdapChecker({ cache, fetchFn, now: () => now, sleep: noSleep })
    expect(await check('stale.com')).toBe(false)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('serves a fresh taken (available:false) entry without fetching', async () => {
    const cache = memCache()
    const now = new Date('2026-07-15T12:00:00Z')
    // aged 25h: older than AVAILABLE_TTL (24h) but well within TAKEN_TTL (30d)
    cache.store.set('taken.com', { available: false, checkedAt: new Date(now.getTime() - AVAILABLE_TTL_MS - 3_600_000) })
    const fetchFn = vi.fn() as unknown as typeof fetch
    const check = createRdapChecker({ cache, fetchFn, now: () => now, sleep: noSleep })
    expect(await check('taken.com')).toBe(false)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('backs off on 429 then succeeds', async () => {
    let calls = 0
    const fetchFn = (async () => registryResponse('', { status: ++calls < 3 ? 429 : 404 })) as typeof fetch
    const check = createRdapChecker({ cache: memCache(), fetchFn, sleep: noSleep })
    expect(await check('busy.com')).toBe(true)
  })

  it('returns null on network error', async () => {
    const failing = (async () => { throw new TypeError('network down') }) as unknown as typeof fetch
    const check = createRdapChecker({ cache: memCache(), fetchFn: failing, sleep: noSleep })
    expect(await check('x.com')).toBeNull()
  })
})

describe('drizzle rdap cache store', () => {
  it('round-trips through the rdap_cache table', async () => {
    const db = createDb(':memory:')
    await migrate(db, { migrationsFolder: 'drizzle' })
    const store = createDrizzleRdapCache(db)
    expect(await store.get('a.com')).toBeNull()
    const t = new Date('2026-07-15T12:00:00Z')
    await store.set('a.com', true, t)
    expect(await store.get('a.com')).toEqual({ available: true, checkedAt: t })
    await store.set('a.com', false, t) // upsert
    expect((await store.get('a.com'))!.available).toBe(false)
  })
})

it('never treats an unsupported RDAP extension as an available domain', async () => {
  const cache = memCache()
  const check = createRdapChecker({ cache, sleep: noSleep, fetchFn: async () => new Response('', { status: 404 }) })
  expect(await check('bakery.zz')).toBeNull()
  expect(cache.store.size).toBe(0)
})
it('uses the free Belgium availability service without RDAP and caches confirmed answers', async () => {
  const cache = memCache()
  const fetchFn = vi.fn()
  const queryBelgium = vi.fn(async () => '%% RC=0\nDomain: bakery.be\nStatus: AVAILABLE\n')
  const check = createRdapChecker({ cache, queryBelgium, fetchFn })
  expect(await check('bakery.be')).toBe(true)
  expect(await check('bakery.be')).toBe(true)
  expect(queryBelgium).toHaveBeenCalledTimes(1)
  expect(fetchFn).not.toHaveBeenCalled()
})
it.each(['%% RC=-2\nDomain: bakery.be', '%% RC=0\nDomain: other.be\nStatus: AVAILABLE', 'garbage'])(
  'leaves inconclusive Belgium responses unknown: %s', async reply => {
    const cache = memCache()
    const check = createRdapChecker({ cache, queryBelgium: async () => reply })
    expect(await check('bakery.be')).toBeNull()
    expect(cache.store.size).toBe(0)
  })
it.each(['REGISTERED', 'NOT AVAILABLE'])('recognizes occupied Belgium domains (%s)', async status => {
  const check = createRdapChecker({ cache: memCache(), queryBelgium: async () => `%% RC=0\nDomain: bakery.be\nStatus: ${status}\n` })
  expect(await check('bakery.be')).toBe(false)
})
