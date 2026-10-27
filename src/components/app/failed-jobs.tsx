'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/client'
import { STAGE_LABELS } from './enrichment-status'
import { Button } from '@/components/brand/button'
interface FailedJob { id: string; kind: string; error: string | null; attempts: number; businessName: string | null }
export function FailedJobs({ scanId, refreshKey, onRetry }: { scanId: string; refreshKey: number; onRetry: () => void }) {
  const { t, system } = useI18n()
  const [jobs, setJobs] = useState<FailedJob[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/scans/${scanId}/jobs`, { signal: controller.signal, cache: 'no-store' })
      .then(async res => { if (!res.ok) throw new Error(); return res.json() })
      .then(data => { if (!controller.signal.aborted) { setJobs(data.jobs); setError(old => old === 'Could not load failed tasks.' ? '' : old) } })
      .catch(() => { if (!controller.signal.aborted) setError('Could not load failed tasks.') })
    return () => controller.abort()
  }, [scanId, refreshKey, version])
  async function retry(jobId?: string) {
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/scans/${scanId}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jobId ? { jobId } : { all: true }) })
      if (!res.ok) throw new Error()
      setVersion(v => v + 1); onRetry()
    } catch { setError('Could not retry tasks. Dependent work may still be running; refresh and try again.') }
    finally { setBusy(false) }
  }
  if (!jobs.length && !error) return null
  return <section className="rounded-xl border border-amber-400/40 p-4" aria-label={t('Failed tasks')}>
    <details>
      <summary className="cursor-pointer text-sm font-medium text-amber-400">{t('Failed tasks')} ({jobs.length})</summary>
      <p className="mt-3 text-xs text-mute">{t('Retry failed tasks after correcting the cause. Dependent checks are refreshed when needed. A paused scan stays paused.')}</p>
      <Button variant="ghost" className="mt-3" disabled={busy || !jobs.length} onClick={() => void retry()}>{t('Retry all failed tasks')}</Button>
      <ul className="mt-4 max-h-96 space-y-3 overflow-auto">
        {jobs.map(job => <li key={job.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-line pt-3 text-sm">
          <div><p>{job.businessName ?? t('Scan collection')} · {t(STAGE_LABELS[job.kind] ?? job.kind)}</p>
            <p className="mt-1 text-xs text-mute">{system(job.error ?? 'No diagnostic available.')} · {t('Attempts: {0}', { 0: job.attempts })}</p></div>
          <Button variant="ghost" disabled={busy} onClick={() => void retry(job.id)}>{t('Retry this task')}</Button>
        </li>)}
      </ul>
    </details>
    {error && <p role="alert" className="mt-3 text-sm text-amber-400">{t(error)}</p>}
  </section>
}
