'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
// TODO(task-10): switch to @/components/app/results-table once it exists
import ResultsTable from '@/components/results-table'
import { Button } from '@/components/brand/button'

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
  const driving = useRef(false)

  const drive = useCallback(async () => {
    if (driving.current) return
    driving.current = true
    const advanceOnce = async (): Promise<ScanState | null> => {
      try {
        const res = await fetch(`/api/scans/${scanId}/advance`, { method: 'POST' })
        if (!res.ok) return null
        return await res.json() as ScanState
      } catch {
        return null
      }
    }
    try {
      let state: ScanState = await (await fetch(`/api/scans/${scanId}`)).json()
      setScan(state)
      if (state.status === 'paused') {
        const next = await advanceOnce()
        if (next === null) return
        state = next
        setScan(state)
      }
      while (state.status === 'running') {
        const next = await advanceOnce()
        if (next === null) break
        state = next
        setScan(state)
      }
    } finally {
      driving.current = false
    }
  }, [scanId])

  useEffect(() => { void drive() }, [drive])

  if (!scan) return <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">Loading…</p>

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
          <span>{scan.status === 'running' ? `${scan.phase}…` : scan.status}</span>
          <span>{scan.totalProcessed}/{scan.totalFound} PROCESSED</span>
        </div>

        {scan.errorMessage && <p className="mt-3 text-sm text-red-400">{scan.errorMessage}</p>}

        {(scan.status === 'paused' || scan.status === 'running') && (
          <Button variant="ghost" onClick={() => { void drive() }} className="mt-4">
            Resume scan
          </Button>
        )}
      </div>

      {scan.status === 'done' && <ResultsTable scanId={scanId} />}
    </div>
  )
}
