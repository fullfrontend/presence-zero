import { inArray } from 'drizzle-orm'
import { getDb, type Db } from '@/db/client'
import { scans } from '@/db/schema'
import { claimJob, ensureScanJobs, JOB_KINDS, refreshScanProgress, renewLease, type JobKind } from '@/core/jobs/queue'
import { failJob, processJob } from '@/core/jobs/process'
import { loadPipelineDeps } from './pipeline-deps'
import { loadRuntimeSettings } from './runtime-settings'

const DEFAULT_LIMITS: Record<JobKind, number> = { collect: 1, search: 1, probe: 4, domains: 2, phone: 2, audit: 1 }
export function workerLimits(env: Record<string, string | undefined>) {
  return Object.fromEntries(JOB_KINDS.map(kind => {
    const value = Number(env[`PRESENCEZERO_CONCURRENCY_${kind.toUpperCase()}`])
    return [kind, Number.isInteger(value) && value >= 1 && value <= 16 ? value : DEFAULT_LIMITS[kind]]
  })) as Record<JobKind, number>
}

/** One scheduling pass; returned jobs are independent and do not hold the scheduler. */
export async function dispatchWorkerJobs(db: Db): Promise<Promise<void>[]> {
  const activeScans = await db.select().from(scans).where(inArray(scans.status, ['running', 'paused', 'failed']))
  for (const scan of activeScans) {
    await ensureScanJobs(db, scan.id)
    await refreshScanProgress(db, scan.id)
  }
  const { env } = await loadRuntimeSettings(db)
  const limits = workerLimits(env)
  const tasks: Promise<void>[] = []
  const budget = Math.max(1, Math.min(1000, Number(env.PRESENCEZERO_BATCH_SIZE) || 8))
  // Give every stage a slot before filling additional concurrency capacity.
  for (let slot = 0; slot < Math.max(...Object.values(limits)) && tasks.length < budget; slot++) {
    for (const kind of JOB_KINDS) {
      if (slot >= limits[kind] || tasks.length >= budget) continue
      const job = await claimJob(db, kind, limits[kind])
      if (!job) continue
      const heartbeat = setInterval(() => { void renewLease(db, job).catch(() => { /* An expired lease will be recovered. */ }) }, 15000)
      heartbeat.unref()
      tasks.push((async () => {
        try {
          const deps = await loadPipelineDeps(db, { audit: kind === 'audit', search: kind === 'search', queued: true })
          await processJob(job, deps)
        } catch (error) { await failJob(job, { db }, error) }
        finally { clearInterval(heartbeat) }
      })().catch(() => { /* Failed database commits remain recoverable via the lease. */ }))
    }
  }
  return tasks
}

type WorkerState = { started: boolean; ticking: boolean }
const globalWorker = globalThis as typeof globalThis & { presenceZeroWorker?: WorkerState }
const state = globalWorker.presenceZeroWorker ??= { started: false, ticking: false }

export function startBackgroundWorker() {
  if (state.started || process.env.NODE_ENV === 'test' || process.env.PRESENCEZERO_WORKER_ENABLED === 'false' || process.env.VERCEL) return
  state.started = true
  const tick = async () => {
    if (state.ticking) return
    state.ticking = true
    try {
      const tasks = await dispatchWorkerJobs(await getDb())
      for (const task of tasks) void task.catch(() => { /* Lease recovery makes failed commits retryable. */ })
    } catch { /* Database unavailable: retry the scheduling pass, not the external call. */ }
    finally { state.ticking = false }
  }
  const timer = setInterval(() => { void tick() }, 1000)
  timer.unref()
  void tick()
}
