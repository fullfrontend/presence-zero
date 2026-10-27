import type { InStatement } from '@libsql/client'
import type { Db } from '@/db/client'

/** Replacing leases atomically prevents an old search/probe/audit from overwriting the edit. */
export async function setManualWebsite(db: Db, businessId: string, website: string) {
  const row = (await db.$client.execute({ sql: 'SELECT b.scan_id, s.status, s.phase FROM businesses b JOIN scans s ON s.id = b.scan_id WHERE b.id = ?', args: [businessId] })).rows[0]
  if (!row) return null
  const scanId = String(row.scan_id)
  const statements: InStatement[] = []
  for (const kind of ['search', 'probe', 'domains', 'audit']) {
    statements.push({ sql: `INSERT INTO scan_jobs (id, scan_id, business_id, kind, status, result) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, result = excluded.result, attempts = 0, available_at = 0, lease_until = 0, owner = NULL, error = NULL`,
      args: [`${businessId}:${kind}`, scanId, businessId, kind, kind === 'search' ? 'done' : 'pending', kind === 'search' ? 'manual' : null] })
  }
  statements.push({ sql: 'UPDATE businesses SET listed_website = ?, presence_status = NULL, probe_detail = NULL, audit_report = NULL, listing_issue = NULL, score = NULL WHERE id = ?', args: [website, businessId] })
  // Older completed scans may predate the durable queue. Do not recollect them.
  statements.push({ sql: "INSERT INTO scan_jobs (id, scan_id, kind, status) VALUES (?, ?, 'collect', ?) ON CONFLICT DO NOTHING", args: [`${scanId}:collect`, scanId, row.status !== 'done' && row.phase === 'fetch' ? 'pending' : 'done'] })
  statements.push({ sql: "UPDATE scans SET status = CASE WHEN status = 'paused' THEN status ELSE 'running' END, phase = CASE WHEN phase = 'fetch' THEN phase ELSE 'process' END, error_message = CASE WHEN status = 'paused' THEN error_message ELSE NULL END WHERE id = ?", args: [scanId] })
  await db.$client.batch(statements, 'write')
  return { scanId, paused: row.status === 'paused' }
}
