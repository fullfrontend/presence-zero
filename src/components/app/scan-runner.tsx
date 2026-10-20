'use client'
import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/i18n/client'
import { STAGE_LABELS } from './enrichment-status'
import ResultsTable from './results-table'
import { Button } from '@/components/brand/button'
import { Skeleton } from './skeleton'

interface ScanState {
  status: 'running' | 'paused' | 'done' | 'failed'
  phase: string
  totalFound: number
  totalProcessed: number
  errorMessage: string | null
  location?: string
  category?: string
  provider?: string
  title?: string | null
  stages?: { kind: string; running: number; pending: number }[]
  enrichment?: { pending: number; running: number; done: number; failed: number }
}

export default function ScanRunner({ scanId }: { scanId: string }) {
  const { t, number, system } = useI18n()
  const [scan, setScan] = useState<ScanState | null>(null)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [busy, setBusy] = useState(false)

  const resume = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/scans/${scanId}/advance`, { method: 'POST' })
      if (!response.ok) throw new Error('resume')
      setScan(await response.json()); setCycle(value => value + 1)
    } catch { setError('Could not resume the scan. Please try again.') }
    finally { setBusy(false) }
  }, [scanId])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    const poll = async () => {
      try {
        const response = await fetch(`/api/scans/${scanId}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('status')
        const current = await response.json() as ScanState
        if (!active) return
        setScan(current); setError(''); setRefreshKey(value => value + 1)
        // Poll independently of all long-running work, including partial results on provider errors.
        if (current.status === 'running' || (current.enrichment?.running ?? 0) > 0 ||
          ((current.status !== 'paused' || current.errorMessage !== 'Paused by you.') && (current.enrichment?.pending ?? 0) > 0)) timer = setTimeout(poll, 1000)
      } catch {
        if (!active) return
        setError('Connection interrupted. Background work continues; reconnecting…')
        timer = setTimeout(poll, 3000)
      }
    }
    void poll()
    return () => { active = false; controller.abort(); clearTimeout(timer) }
  }, [scanId, cycle])

  async function pause() {
    setBusy(true)
    try {
      const response = await fetch(`/api/scans/${scanId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paused: true }) })
      if (!response.ok) throw new Error('pause')
      setScan(await response.json()); setCycle(value => value + 1)
    } catch { setError('Could not pause the scan. Please try again.') }
    finally { setBusy(false) }
  }

  if (!scan) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-20 w-full" />{error && <p role="alert">{t(error)}</p>}</div>
  const pct = scan.totalFound > 0 ? Math.min(100, Math.round(scan.totalProcessed / scan.totalFound * 100)) : 0
  const complete = scan.status === 'done'
  const enrichment = scan.enrichment
  const runningStages = scan.stages?.filter(stage => stage.running > 0) ?? []
  const waitingStages = scan.stages?.filter(stage => stage.pending > 0) ?? []
  const activeStages = runningStages.length ? runningStages : scan.status === 'running' ? waitingStages : []
  const stageDetail = activeStages.map(stage => t(STAGE_LABELS[stage.kind] ?? stage.kind)).join(' · ')
  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{scan.title?.trim() || t('{0} in {1}', { 0: scan.category ?? '', 1: scan.location ?? '' })}</h1>
      <p className="mt-2 text-sm text-mute">{t('Prospects appear immediately. Website searches, checks and AI qualification update independently in the background.')}</p>
    </div>
    <section className="rounded-xl border border-line bg-surface p-6" aria-label={t('Scan progress')}>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <span className="text-lime">{t('{0} prospects collected', { 0: number(scan.totalFound) })}</span>
        <span className="text-dim">{t('{0} / {1} fully processed', { 0: number(scan.totalProcessed), 1: number(scan.totalFound) })}</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('Enrichment progress')}>
        <div className="h-full bg-lime transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-mute" role="status">
        <span className="text-dim">{t(scan.status)}{stageDetail && <> — {runningStages.length === 0 && <>{t('Waiting')} : </>}{stageDetail}</>}
          {!stageDetail && scan.status === 'running' && <> — {t(scan.phase === 'fetch' ? 'Collecting prospects…' : 'Collection complete · enriching prospects…')}</>}
        </span>
        {enrichment && <><span>{t('{0} tasks waiting', { 0: number(enrichment.pending) })}</span><span>{t('{0} tasks running', { 0: number(enrichment.running) })}</span>
          {enrichment.failed > 0 && <span className="text-amber-400">{t('{0} tasks failed', { 0: number(enrichment.failed) })}</span>}</>}
      </div>
      {scan.errorMessage && <p className="mt-3 text-sm text-amber-400">{system(scan.errorMessage)}</p>}
      {error && <p className="mt-3 text-sm text-amber-400" role="alert">{t(error)}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {scan.status === 'running' && <Button variant="ghost" disabled={busy} onClick={pause}>{t('Pause')}</Button>}
        {scan.status === 'paused' && <Button variant="ghost" disabled={busy} onClick={() => { void resume() }}>{t('Resume scan')}</Button>}
        {(complete || scan.status === 'failed') && <Button href="/app" variant="link">{t('New scan')}</Button>}
        {scan.status === 'paused' && <span className="text-xs text-mute">{t('Running tasks finish safely. No new tasks start while paused by you.')}</span>}
      </div>
    </section>
    {complete && scan.totalFound === 0 && <p className="text-sm text-dim">{t('The provider returned no businesses for this area and category.')}</p>}
    {scan.totalFound > 0 && <ResultsTable scanId={scanId} location={scan.location ?? null} refreshKey={refreshKey} partial={!complete} />}
  </div>
}
