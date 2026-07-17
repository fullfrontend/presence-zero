// Must be set before importing the db client so getDb()'s default never
// touches the real file DB. A libSQL :memory: db is per-connection, so this
// also verifies getDb() returns one shared, migrated connection.
process.env.DATABASE_URL = ':memory:'

import { describe, it, expect } from 'vitest'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb, getDb } from '@/db/client'
import { scans, businesses } from '@/db/schema'

describe('db', () => {
  it('creates schema and round-trips a scan row', async () => {
    const db = createDb(':memory:')
    await migrate(db, { migrationsFolder: 'drizzle' })
    await db.insert(scans).values({
      id: 's1', createdAt: new Date(), location: 'Ottawa, ON', category: 'bakery',
      countryCode: 'ca', provider: 'csv',
    })
    const rows = await db.select().from(scans)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('running')
    expect(rows[0].phase).toBe('fetch')
  })

  it('getDb() is a singleton that migrates once under concurrency', async () => {
    // Two concurrent first-time callers must await the same in-flight promise
    // and get the SAME instance — neither should double-run migrate() and throw
    // "table already exists" on the fresh :memory: db.
    const [a, b] = await Promise.all([getDb(), getDb()])
    expect(a).toBe(b)

    // A later call resolves to the same instance too.
    const c = await getDb()
    expect(c).toBe(a)

    // The shared connection is migrated and usable.
    await a.insert(scans).values({
      id: 'g1', createdAt: new Date(), location: 'Kanata, ON', category: 'cafe',
      countryCode: 'ca', provider: 'csv',
    })
    const rows = await b.select().from(scans)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('g1')
    expect(rows[0].status).toBe('running')
    expect(rows[0].phase).toBe('fetch')
  })

  it('stores a probe detail alongside the presence status', async () => {
    const db = createDb(':memory:')
    await migrate(db, { migrationsFolder: 'drizzle' })
    await db.insert(scans).values({
      id: 'sd1', createdAt: new Date(), location: 'Ottawa, ON', category: 'bakery',
      countryCode: 'ca', provider: 'csv',
    })
    await db.insert(businesses).values({
      id: 'bd1', scanId: 'sd1', name: 'Joe', presenceStatus: 'dead',
      probeDetail: 'Returned HTTP 503.',
    })
    const row = (await db.select().from(businesses))[0]
    expect(row.probeDetail).toBe('Returned HTTP 503.')
  })
})
