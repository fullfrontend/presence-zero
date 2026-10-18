import { expect, it, vi } from 'vitest'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb } from '@/db/client'
import { searchThrottle } from '@/db/schema'
import { createSearchThrottle } from '@/core/enrich/search-throttle'

const input = { name: 'Business', address: '12 Main Street' }
const empty = { website: null, outcome: 'not_found' as const, detail: 'Completed' }
async function setup() {
  const db = createDb(':memory:')
  await migrate(db, { migrationsFolder: 'drizzle' })
  let time = 100000
  const sleep = vi.fn(async (ms: number) => { time += ms })
  const options = { intervalMs: 5000, cooldownMs: 300000, now: () => time, sleep }
  return { db, options, sleep, now: () => time }
}

it('shares request spacing across independently created workers', async () => {
  const { db, options, now } = await setup()
  const starts: number[] = []
  const search = async () => { starts.push(now()); return empty }
  await createSearchThrottle(db, 'service', options)(search)(input)
  await createSearchThrottle(db, 'service', options)(search)(input)
  expect(starts).toEqual([100000, 105000])
})

it('waits for the longer service cooldown then retries the same business once', async () => {
  const { db, options, now } = await setup()
  const starts: number[] = []
  const search = vi.fn(async () => {
    starts.push(now())
    return starts.length === 1 ? { ...empty, retryAfterMs: 600000 } : empty
  })
  expect(await createSearchThrottle(db, 'service', options)(search)(input)).toEqual(empty)
  expect(starts).toEqual([100000, 700000])
  expect(search.mock.calls).toHaveLength(2)
})

it('bounds retries and persists the cooldown for a later worker', async () => {
  const { db, options, now } = await setup()
  const blocked = vi.fn(async () => ({ ...empty, retryAfterMs: 1000 }))
  const result = await createSearchThrottle(db, 'service', options)(blocked)(input)
  expect(result.retryAfterMs).toBe(300000)
  expect(blocked).toHaveBeenCalledTimes(2)
  const search = vi.fn(async () => { expect(now()).toBe(700000); return empty })
  await createSearchThrottle(db, 'service', options)(search)(input)
})

it('keeps a matched website but delays the next query when another engine is blocked', async () => {
  const { db, options, now } = await setup()
  const matched = { ...empty, website: 'https://business.example', retryAfterMs: 300000 }
  const search = vi.fn(async () => matched)
  expect(await createSearchThrottle(db, 'service', options)(search)(input)).toEqual(matched)
  expect(search).toHaveBeenCalledTimes(1)
  await createSearchThrottle(db, 'service', options)(async () => empty)(input)
  expect(now()).toBe(400000)
})

it('releases the lease on failure and recovers an abandoned lease after expiry', async () => {
  const { db, options, now } = await setup()
  const run = createSearchThrottle(db, 'service', options)
  await expect(run(async () => { throw new Error('offline') })(input)).rejects.toThrow('offline')
  expect((await db.select().from(searchThrottle))[0].owner).toBeNull()
  await db.update(searchThrottle).set({ owner: 'dead-worker', leaseUntil: now() + 30000 })
  await run(async () => empty)(input)
  expect(now()).toBe(130000)
})

it('does not acquire a lease for a business without an address', async () => {
  const { db, options } = await setup()
  await createSearchThrottle(db, 'service', options)(async () => empty)({ ...input, address: null })
  expect(await db.select().from(searchThrottle)).toEqual([])
})

it('prevents overlapping requests from two workers sharing a database', async () => {
  const { db, options } = await setup()
  let release!: () => void
  let started!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const ready = new Promise<void>(resolve => { started = resolve })
  let active = 0
  const first = createSearchThrottle(db, 'service', options)(async () => {
    active++
    started()
    await gate
    active--
    return empty
  })(input)
  await ready
  const sleep = vi.fn(async (ms: number) => {
    expect(active).toBe(1)
    release()
    await first
    await options.sleep(ms)
  })
  await createSearchThrottle(db, 'service', { ...options, sleep })(async () => {
    expect(active).toBe(0)
    return empty
  })(input)
  expect(sleep).toHaveBeenCalledTimes(1)
})
