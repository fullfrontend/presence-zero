import type { Client } from '@libsql/client'

/** Migration 0006 briefly shipped without result during development.
 * Existing databases recorded that migration before the column was added.
 * SQLite has no ADD COLUMN IF NOT EXISTS; inspect and tolerate another worker
 * performing this same additive repair. Never rebuild or delete queued jobs.
 */
export async function ensureScanJobResultColumn(client: Client): Promise<void> {
  const hasResult = async () => (await client.execute('PRAGMA table_info(scan_jobs)')).rows.some(row => row.name === 'result')
  if (await hasResult()) return
  try {
    await client.execute('ALTER TABLE scan_jobs ADD COLUMN result text')
  } catch (error) {
    if (!await hasResult()) throw error
  }
}
