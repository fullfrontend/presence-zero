import type { Db } from '@/db/client'
import type { InStatement, InValue } from '@libsql/client'

const downstream: Record<string, string[]> = {
  collect: [], search: ['probe', 'domains', 'audit'], probe: ['domains', 'audit'],
  phone: ['audit'], domains: [], audit: [],
}

/** Guarded atomic batch: concurrent requests cannot reset claimed work or retry it twice. */
export async function retryFailedJobs(db: Db, scanId: string, jobId?: string) {
  const client = db.$client
  const scan = (await client.execute({ sql: 'SELECT status FROM scans WHERE id = ?', args: [scanId] })).rows[0]
  if (!scan) throw new Error('scan_not_found')
  const allJobs = (await client.execute({ sql: 'SELECT id, kind, business_id, status FROM scan_jobs WHERE scan_id = ?', args: [scanId] })).rows
  const failed = allJobs.filter(job => job.status === 'failed' && (!jobId || job.id === jobId))
  if (jobId && !failed.length) throw new Error('job_not_failed')
  if (!failed.length) return { retried: 0, paused: scan.status === 'paused' }
  const affected = allJobs.filter(job => failed.some(root => root.id === job.id ||
    (root.business_id !== null && root.business_id === job.business_id && downstream[String(root.kind)]?.includes(String(job.kind)))))
  const ids = affected.map(job => job.id)
  const roots = failed.map(job => job.id)
  const slots = (items: unknown[]) => items.map(() => '?').join(',')
  const guard = `(SELECT count(*) FROM scan_jobs WHERE scan_id = ? AND id IN (${slots(roots)}) AND status = 'failed') = ? AND NOT EXISTS (SELECT 1 FROM scan_jobs WHERE scan_id = ? AND id IN (${slots(ids)}) AND status = 'running')`
  const guardArgs: InValue[] = [scanId, ...roots, roots.length, scanId, ...ids]
  const writes: InStatement[] = []
  const audited = affected.filter(job => job.kind === 'audit' && job.business_id !== null).map(job => job.business_id)
  if (audited.length) writes.push({ sql: `UPDATE businesses SET audit_report = NULL, score = NULL WHERE scan_id = ? AND id IN (${slots(audited)}) AND ${guard}`, args: [scanId, ...audited, ...guardArgs] })
  writes.push({ sql: `UPDATE scans SET status = CASE WHEN status = 'paused' THEN status ELSE 'running' END, phase = ?, error_message = CASE WHEN status = 'paused' THEN error_message ELSE NULL END WHERE id = ? AND ${guard}`,
    args: [affected.some(job => job.kind === 'collect') || allJobs.some(job => job.kind === 'collect' && ['pending', 'running'].includes(String(job.status))) ? 'fetch' : 'process', scanId, ...guardArgs] })
  // Reset jobs last: all previous writes test the same failed-root guard.
  writes.push({ sql: `UPDATE scan_jobs SET status = 'pending', attempts = 0, available_at = 0, lease_until = 0, owner = NULL, error = NULL WHERE scan_id = ? AND id IN (${slots(ids)}) AND ${guard}`, args: [scanId, ...ids, ...guardArgs] })
  const results = await client.batch(writes, 'write')
  if (!results[results.length - 1].rowsAffected) throw new Error('dependent_task_running')
  return { retried: failed.length, paused: scan.status === 'paused' }
}
