import { randomUUID, createHash } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import type { InStatement, InValue } from '@libsql/client'
import type { Db } from '@/db/client'
import { businesses, domainCandidates, scanJobs, scans } from '@/db/schema'
import { explainBusinessScore } from '../business-score'

export const JOB_KINDS = ['collect', 'search', 'probe', 'domains', 'phone', 'audit'] as const
export type JobKind = typeof JOB_KINDS[number]
export type Job = typeof scanJobs.$inferSelect
export const LEASE_MS = 60000
const stages = JOB_KINDS.filter(kind => kind !== 'collect')

/** Conditional writes fence out a worker whose lease was reclaimed after a crash. */
export function jobWrites(job: Job, now: number) {
  const guard = "EXISTS (SELECT 1 FROM scan_jobs WHERE id = ? AND owner = ? AND status = 'running' AND lease_until > ?)"
  const guardArgs: InValue[] = [job.id, job.owner, now]
  const quote = (name: string) => `"${name}"`
  return {
    update(table: 'businesses' | 'scans' | 'scan_jobs', id: string, values: Record<string, InValue>): InStatement {
      return { sql: `UPDATE ${table} SET ${Object.keys(values).map(key => `${quote(key)} = ?`).join(', ')} WHERE id = ? AND ${guard}${table === 'scans' ? " AND status = 'running'" : ''}`,
        args: [...Object.values(values), id, ...guardArgs] }
    },
    insert(table: 'businesses' | 'domain_candidates' | 'scan_jobs', values: Record<string, InValue>): InStatement {
      return { sql: `INSERT INTO ${table} (${Object.keys(values).map(quote).join(', ')}) SELECT ${Object.keys(values).map(() => '?').join(', ')} WHERE ${guard} ON CONFLICT DO NOTHING`,
        args: [...Object.values(values), ...guardArgs] }
    },
    raw(statement: string, args: InValue[]): InStatement {
      return { sql: `${statement} AND ${guard}`, args: [...args, ...guardArgs] }
    },
  }
}

export function stageRows(scanId: string, businessId: string, complete = false) {
  return stages.map(kind => ({ id: `${businessId}:${kind}`, scan_id: scanId, business_id: businessId, kind,
    status: complete ? 'done' : 'pending' }))
}

/** Bootstrap new scans, or safely adopt an unfinished scan from the old pipeline. */
export async function ensureScanJobs(db: Db, scanId: string) {
  const scan = (await db.select().from(scans).where(eq(scans.id, scanId)))[0]
  if (!scan || scan.status === 'done' || scan.status === 'failed') return
  if ((await db.select({ id: scanJobs.id }).from(scanJobs).where(eq(scanJobs.id, `${scanId}:collect`)))[0]) return
  const rows = await db.select().from(businesses).where(eq(businesses.scanId, scanId))
  const inserts = rows.flatMap(b => stageRows(scanId, b.id, !!b.presenceStatus && b.presenceStatus !== 'probe_failed'))
  // All jobs are inserted atomically; a second server cannot observe partial bootstrap.
  const statements: InStatement[] = inserts.map(row => ({ sql: 'INSERT INTO scan_jobs (id, scan_id, business_id, kind, status) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING', args: Object.values(row) }))
  statements.push({ sql: 'INSERT INTO scan_jobs (id, scan_id, kind, status) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', args: [`${scanId}:collect`, scanId, 'collect', scan.phase === 'fetch' ? 'pending' : 'done'] })
  await db.$client.batch(statements, 'write')
}

/** A single UPDATE atomically enforces a global per-stage concurrency ceiling. */
export async function claimJob(db: Db, kind: JobKind, limit: number, now = Date.now()): Promise<Job | undefined> {
  const dependencies = kind === 'probe' ? ['search'] : kind === 'domains' ? ['probe'] : kind === 'audit' ? ['probe', 'phone'] : []
  const dependencySql = dependencies.length ? sql`AND NOT EXISTS (
    SELECT 1 FROM scan_jobs dependency WHERE dependency.business_id = candidate.business_id
    AND dependency.kind IN (${sql.join(dependencies.map(value => sql`${value}`), sql`, `)}) AND dependency.status IN ('pending', 'running')
  )` : sql``
  const eligibleScan = kind === 'collect' ? sql`s.status = 'running'` : sql`(s.status IN ('running', 'failed') OR (s.status = 'paused' AND coalesce(s.error_message, '') != 'Paused by you.'))`
  const result = await db.update(scanJobs).set({ status: 'running', owner: randomUUID(), leaseUntil: now + LEASE_MS, attempts: sql`${scanJobs.attempts} + 1` })
    .where(sql`${scanJobs.id} = (SELECT candidate.id FROM scan_jobs candidate JOIN scans s ON s.id = candidate.scan_id
      WHERE candidate.kind = ${kind} AND candidate.available_at <= ${now}
      AND (candidate.status = 'pending' OR (candidate.status = 'running' AND candidate.lease_until <= ${now}))
      AND ${eligibleScan} ${dependencySql}
      ORDER BY candidate.available_at, s.created_at, candidate.id LIMIT 1)
      AND (SELECT count(*) FROM scan_jobs active WHERE active.kind = ${kind} AND active.status = 'running' AND active.lease_until > ${now}) < ${limit}`)
    .returning()
  return result[0]
}

export async function renewLease(db: Db, job: Job, now = Date.now()) {
  await db.update(scanJobs).set({ leaseUntil: now + LEASE_MS })
    .where(and(eq(scanJobs.id, job.id), eq(scanJobs.owner, job.owner!), eq(scanJobs.status, 'running')))
}

export function collectedBusinessId(scanId: string, cursor: string | null, index: number) {
  return createHash('sha256').update(JSON.stringify([scanId, cursor, index])).digest('hex')
}

/** Refresh scores from independently persisted evidence, then determine completion. */
export async function refreshScanProgress(db: Db, scanId: string) {
  const scan = (await db.select().from(scans).where(eq(scans.id, scanId)))[0]
  if (!scan) return
  const jobs = await db.select().from(scanJobs).where(eq(scanJobs.scanId, scanId))
  if (!jobs.length) return
  const rows = await db.select().from(businesses).where(eq(businesses.scanId, scanId))
  const domains = await db.select({ businessId: domainCandidates.businessId, domain: domainCandidates.domain, available: domainCandidates.available })
    .from(domainCandidates).innerJoin(businesses, eq(businesses.id, domainCandidates.businessId)).where(eq(businesses.scanId, scanId))
  let completed = 0
  for (const b of rows) {
    const pending = jobs.some(job => job.businessId === b.id && (job.status === 'pending' || job.status === 'running'))
    if (!pending) completed++
    const score = explainBusinessScore(b, domains.filter(d => d.businessId === b.id), scan.countryCode).total
    if (b.score !== score) await db.update(businesses).set({ score }).where(eq(businesses.id, b.id))
  }
  const collecting = jobs.find(job => job.kind === 'collect')
  const pending = jobs.some(job => job.status === 'pending' || job.status === 'running')
  const done = collecting?.status === 'done' && !pending
  // Never resume a user pause or hide a provider error during background settlement.
  await db.update(scans).set({ totalFound: rows.length, totalProcessed: completed,
    ...(scan.status === 'running' ? { phase: done ? 'done' : collecting?.status === 'done' ? 'process' : 'fetch',
      ...(collecting?.status === 'failed' ? { status: 'failed' as const, errorMessage: collecting.error } : done ? { status: 'done' as const, errorMessage: jobs.some(job => job.status === 'failed') ? 'Some enrichment tasks failed. Collected prospects are preserved.' : null } : {}) } : {}),
  }).where(and(eq(scans.id, scanId), eq(scans.status, scan.status)))
}
