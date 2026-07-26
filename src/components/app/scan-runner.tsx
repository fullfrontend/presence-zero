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
  location?: string
  category?: string
  provider?: string
  title?: string | null
  label?: string | null
  createdAt?: string | Date | number
}

const PHASES = ['fetch', 'process', 'retry', 'done'] as const

function formatScanWhen(createdAt: ScanState['createdAt']): string | null {
  if (createdAt == null) return null
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ScanRunner({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanState | null>(null)
  const [working, setWorking] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)
  const [etaLabel, setEtaLabel] = useState<string | null>(null)
  const [driveError, setDriveError] = useState<string | null>(null)
  const [interrupted, setInterrupted] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const driving = useRef(false)
  const stopRequested = useRef(false)

  const drive = useCallback(async () => {
    if (driving.current) return
    driving.current = true
    stopRequested.current = false
    const started = Date.now()
    setDriveError(null)
    setInterrupted(false)
    setUserPaused(false)
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
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          setDriveError(body.error ?? `Advance failed (HTTP ${res.status}). Your progress is saved — continue when ready.`)
          setInterrupted(true)
          return null
        }
        return await res.json() as ScanState
      } catch {
        setDriveError('Network error while advancing the scan. Progress is saved — hit Continue to resume.')
        setInterrupted(true)
        return null
      }
    }
    setWorking(true)
    try {
      const initial = await (await fetch(`/api/scans/${scanId}`)).json() as ScanState
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
        if (stopRequested.current) {
          setUserPaused(true)
          break
        }
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

  function requestPause() {
    stopRequested.current = true
  }

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
  const headline = scan.title?.trim()
    || (scan.category && scan.location ? `${scan.category} in ${scan.location}` : 'Scan results')
  const when = formatScanWhen(scan.createdAt)
  const showContinue = interrupted
    || userPaused
    || scan.status === 'paused'
    || (scan.status === 'running' && !working)
  const showPartialResults = scan.totalProcessed > 0 && scan.totalFound > 0
  const scanDone = scan.status === 'done'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{headline}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
          {scan.location && <span className="text-dim">{scan.location}</span>}
          {scan.category && <span>· {scan.category}</span>}
          {scan.provider && <span>· {scan.provider}</span>}
          {scan.label && <span className="rounded border border-lime/40 px-1.5 py-0.5 text-lime">{scan.label}</span>}
          {when && <span>· {when}</span>}
        </p>
      </div>

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
            className={`h-full rounded-full bg-lime transition-all ${scan.status === 'running' && working ? 'pz-sheen' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          <span className="flex items-center gap-2">
            {userPaused ? 'paused by you' : scan.status === 'running' ? `${scan.phase}…` : scan.status}
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
            {scan.errorMessage ? `Paused: ${scan.errorMessage}` : 'Paused — the provider is busy or rate-limited.'} Hit Continue to resume where it left off.
          </p>
        )}
        {userPaused && (
          <p className="mt-3 text-sm text-amber-400">
            Paused by you. Progress is saved — hit Continue when you want the scan to keep advancing.
          </p>
        )}
        {driveError && (
          <p className="mt-3 text-sm text-amber-400" role="alert">{driveError}</p>
        )}
        {scan.status === 'failed' && (
          <p className="mt-3 text-sm text-red-400">
            {scan.errorMessage ?? 'The scan failed.'}
            {provider === 'google' && ' If you selected Google Places, check that a valid API key is set in Settings.'}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {working && scan.status === 'running' && (
            <Button variant="ghost" onClick={requestPause}>Pause</Button>
          )}
          {showContinue && (
            <Button variant="ghost" onClick={() => { void drive() }} disabled={working}>
              {working ? 'Continuing…' : interrupted || userPaused || scan.status === 'running' ? 'Continue scan' : 'Resume scan'}
            </Button>
          )}
          {scan.status === 'failed' && (
            <Button href="/app">Start a new scan</Button>
          )}
        </div>
      </div>

      {scanDone && scan.totalFound === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-surface/40 p-6 text-sm">
          <p className="text-text">The provider returned no businesses for this area and category.</p>
          <p className="mt-2 text-dim">Try a broader location, a different category, or the Google Places provider (richer coverage) — then start a new scan.</p>
          <div className="mt-4"><Button href="/app">Start a new scan</Button></div>
        </div>
      )}

      {showPartialResults && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {!scanDone && (
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-lime">
                Live results — updating as leads finish…
              </p>
            )}
            {scanDone && (
              <div className="ml-auto">
                <Button href="/app" variant="link">New scan</Button>
              </div>
            )}
          </div>
          <ResultsTable
            scanId={scanId}
            location={scan.location ?? null}
            refreshKey={scan.totalProcessed}
            partial={!scanDone}
          />
        </div>
      )}
    </div>
  )
}
