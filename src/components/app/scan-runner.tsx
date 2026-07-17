'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import ResultsTable from '@/components/app/results-table'
import { Button } from '@/components/brand/button'
import { Skeleton } from '@/components/app/skeleton'

interface ScanState {
  status: 'running' | 'paused' | 'done' | 'failed'
  phase: string
  totalFound: number
  totalProcessed: number
  errorMessage: string | null
}

const PHASES = ['fetch', 'process', 'retry', 'done'] as const

export default function ScanRunner({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanState | null>(null)
  const [working, setWorking] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)
  const [etaLabel, setEtaLabel] = useState<string | null>(null)
  const driving = useRef(false)

  const drive = useCallback(async () => {
    if (driving.current) return
    driving.current = true
    const started = Date.now()
    // ETA from the observed advance cadence — computed off-render (Date.now is impure).
    const updateEta = (s: ScanState) => {
      if (s.status === 'running' && s.totalProcessed > 0 && s.totalFound > s.totalProcessed) {
        const elapsed = (Date.now() - started) / 1000
        const rate = s.totalProcessed / elapsed
        if (rate > 0) {
          const secs = Math.max(1, Math.round((s.totalFound - s.totalProcessed) / rate))
          setEtaLabel(secs >= 90 ? `~${Math.round(secs / 60)}m left` : `~${secs}s left`)
          return
        }
      }
      setEtaLabel(null)
    }
    const advanceOnce = async (): Promise<ScanState | null> => {
      try {
        const res = await fetch(`/api/scans/${scanId}/advance`, { method: 'POST' })
        if (!res.ok) return null
        return await res.json() as ScanState
      } catch {
        return null
      }
    }
    setWorking(true)
    try {
      const initial = await (await fetch(`/api/scans/${scanId}`)).json()
      if (typeof initial?.provider === 'string') setProvider(initial.provider)
      let state: ScanState = initial
      setScan(state)
      updateEta(state)
      if (state.status === 'paused') {
        const next = await advanceOnce()
        if (next === null) return
        state = next
        setScan(state)
        updateEta(state)
      }
      while (state.status === 'running') {
        const next = await advanceOnce()
        if (next === null) break
        state = next
        setScan(state)
        updateEta(state)
      }
    } finally {
      driving.current = false
      setWorking(false)
      setEtaLabel(null)
    }
  }, [scanId])

  useEffect(() => { void drive() }, [drive])

  if (!scan) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="mt-4 h-1.5 w-full" />
        <Skeleton className="mt-2 h-3 w-32" />
      </div>
    )
  }

  const pct = scan.totalFound > 0 ? Math.round((scan.totalProcessed / scan.totalFound) * 100) : 0
  const activeIndex = PHASES.indexOf(scan.phase as (typeof PHASES)[number])

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          {PHASES.map((phase, i) => (
            <span key={phase} className="flex items-center gap-2">
              <span
                className={
                  scan.status === 'done' || i === activeIndex
                    ? 'text-lime'
                    : i < activeIndex
                      ? 'text-text'
                      : 'text-mute'
                }
              >
                {phase.toUpperCase()}
              </span>
              {i < PHASES.length - 1 && <span className="text-mute">→</span>}
            </span>
          ))}
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className={`h-full rounded-full bg-lime transition-all ${scan.status === 'running' ? 'pz-sheen' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          <span className="flex items-center gap-2">
            {scan.status === 'running' ? `${scan.phase}…` : scan.status}
            {working && (
              <span className="flex items-center gap-1.5 text-lime">
                <span className="pz-spin inline-block h-3 w-3 rounded-full border border-lime border-t-transparent" />
                {scan.status === 'paused' ? 'Retrying…' : 'Working…'}
              </span>
            )}
          </span>
          <span className="flex items-center gap-3">
            {etaLabel && <span className="text-dim">{etaLabel}</span>}
            <span>{scan.totalProcessed}/{scan.totalFound} PROCESSED</span>
          </span>
        </div>

        {scan.status === 'paused' && (
          <p className="mt-3 text-sm text-amber-400">
            {scan.errorMessage ? `Paused: ${scan.errorMessage}` : 'Paused — the provider is busy or rate-limited.'} Hit Resume to continue where it left off.
          </p>
        )}
        {scan.status === 'failed' && (
          <p className="mt-3 text-sm text-red-400">
            {scan.errorMessage ?? 'The scan failed.'}
            {provider === 'google' && ' If you selected Google Places, check that a valid API key is set in Settings.'}
          </p>
        )}

        {(scan.status === 'paused' || scan.status === 'running') && (
          <Button variant="ghost" onClick={() => { void drive() }} className="mt-4" disabled={working}>
            {working ? 'Resuming…' : 'Resume scan'}
          </Button>
        )}

        {scan.status === 'failed' && (
          <div className="mt-4 flex items-center gap-3">
            <Button href="/app">Start a new scan</Button>
          </div>
        )}
      </div>

      {scan.status === 'done' && scan.totalFound === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-surface/40 p-6 text-sm">
          <p className="text-text">The provider returned no businesses for this area and category.</p>
          <p className="mt-2 text-dim">Try a broader location, a different category, or the Google Places provider (richer coverage) — then start a new scan.</p>
          <div className="mt-4"><Button href="/app">Start a new scan</Button></div>
        </div>
      )}

      {scan.status === 'done' && scan.totalFound > 0 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button href="/app" variant="link">{'New scan'}</Button>
          </div>
          <ResultsTable scanId={scanId} />
        </div>
      )}
    </div>
  )
}
