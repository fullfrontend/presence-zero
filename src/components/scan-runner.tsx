'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import ResultsTable from '@/components/results-table'

interface ScanState {
  status: 'running' | 'paused' | 'done' | 'failed'
  phase: string
  totalFound: number
  totalProcessed: number
  errorMessage: string | null
}

export default function ScanRunner({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanState | null>(null)
  const driving = useRef(false)

  const drive = useCallback(async () => {
    if (driving.current) return
    driving.current = true
    try {
      let state: ScanState = await (await fetch(`/api/scans/${scanId}`)).json()
      setScan(state)
      if (state.status === 'paused') {
        state = await (await fetch(`/api/scans/${scanId}/advance`, { method: 'POST' })).json()
        setScan(state)
      }
      while (state.status === 'running') {
        state = await (await fetch(`/api/scans/${scanId}/advance`, { method: 'POST' })).json()
        setScan(state)
      }
    } finally {
      driving.current = false
    }
  }, [scanId])

  useEffect(() => { void drive() }, [drive])

  if (!scan) return <p className="text-sm text-zinc-500">Loading…</p>

  const pct = scan.totalFound > 0 ? Math.round((scan.totalProcessed / scan.totalFound) * 100) : 0
  return (
    <div className="space-y-6">
      <div className="rounded border bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium capitalize">{scan.status === 'running' ? `${scan.phase}…` : scan.status}</span>
          <span className="text-zinc-500">{scan.totalProcessed}/{scan.totalFound} processed</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-zinc-200">
          <div className="h-full bg-zinc-900 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {scan.errorMessage && <p className="mt-3 text-sm text-red-600">{scan.errorMessage}</p>}
        {scan.status === 'paused' && (
          <button onClick={() => { void drive() }} className="mt-3 rounded bg-zinc-900 px-3 py-1.5 text-sm text-white">
            Resume scan
          </button>
        )}
      </div>
      {scan.status === 'done' && <ResultsTable scanId={scanId} />}
    </div>
  )
}
