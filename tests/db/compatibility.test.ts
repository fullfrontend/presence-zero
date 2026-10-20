import { expect, it } from 'vitest'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb } from '@/db/client'
import { ensureScanJobResultColumn } from '@/db/compatibility'
import { businesses, scans, scanJobs } from '@/db/schema'

async function populatedDb() {
  const db = createDb(':memory:')
  await migrate(db, { migrationsFolder: 'drizzle' })
  await db.insert(scans).values({ id: 'scan', createdAt: new Date(), location: 'Charleroi', category: 'restaurant', provider: 'osm' })
  await db.insert(businesses).values({ id: 'business', scanId: 'scan', name: 'Existing prospect', note: 'Preserve this note' })
  await db.insert(scanJobs).values({ id: 'job', scanId: 'scan', businessId: 'business', kind: 'search', status: 'running', owner: 'worker', attempts: 2, leaseUntil: 12345, result: 'discovered' })
  return db
}

it('repairs the already-applied legacy migration without losing scan, prospect or job state', async () => {
  const db = await populatedDb()
  try {
    await db.$client.execute('ALTER TABLE scan_jobs DROP COLUMN result')
    // Re-running Drizzle does not fix an already recorded migration.
    await migrate(db, { migrationsFolder: 'drizzle' })
    expect((await db.$client.execute('PRAGMA table_info(scan_jobs)')).rows.some(row => row.name === 'result')).toBe(false)
    const history = await db.$client.execute('SELECT * FROM __drizzle_migrations')
    await ensureScanJobResultColumn(db.$client)
    await ensureScanJobResultColumn(db.$client)
    expect((await db.select().from(scanJobs))[0]).toMatchObject({ id: 'job', status: 'running', owner: 'worker', attempts: 2, leaseUntil: 12345, result: null })
    expect((await db.select().from(businesses))[0].note).toBe('Preserve this note')
    expect(await db.select().from(scans)).toHaveLength(1)
    expect((await db.$client.execute('SELECT * FROM __drizzle_migrations')).rows).toEqual(history.rows)
  } finally { db.$client.close() }
})
it('leaves the current schema and existing discovery provenance unchanged', async () => {
  const db = await populatedDb()
  try {
    await ensureScanJobResultColumn(db.$client)
    await ensureScanJobResultColumn(db.$client)
    expect((await db.select().from(scanJobs))[0].result).toBe('discovered')
  } finally { db.$client.close() }
})
