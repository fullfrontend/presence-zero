'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/brand/button'
import { ScoreCell } from './score-cell'
import { PresenceBadge } from './presence-badge'
import { DomainChips } from './domain-chips'
import { ScoreHistogram } from './score-histogram'

interface DomainInfo { domain: string; available: boolean | null }
interface Result {
  id: string; name: string; address: string | null; phone: string | null
  rating: number | null; reviewCount: number | null; listedWebsite: string | null
  presenceStatus: string | null; score: number | null; leadStatus: string; note: string | null
  domains: DomainInfo[]
}

const LEAD_STATUSES = ['new', 'contacted', 'replied', 'won', 'lost', 'skipped'] as const
const MIN_SCORE_OPTIONS = [0, 40, 60, 80]

const SELECT_CLS = 'rounded border border-line bg-surface px-2 py-1 font-mono text-xs text-text focus:border-lime/60 focus:outline-none'
const INPUT_CLS = 'w-36 rounded border border-line bg-surface px-2 py-1 text-xs text-text focus:border-lime/60 focus:outline-none'

export default function ResultsTable(
  { scanId, readOnly = false, initialResults }:
  { scanId: string; readOnly?: boolean; initialResults?: Result[] },
) {
  const [results, setResults] = useState<Result[]>(initialResults ?? [])
  const [minScore, setMinScore] = useState(0)
  const [leadsOnly, setLeadsOnly] = useState(true)

  useEffect(() => {
    if (readOnly) return
    let mounted = true

    const load = async () => {
      const params = new URLSearchParams()
      if (minScore > 0) params.set('minScore', String(minScore))
      const res = await fetch(`/api/scans/${scanId}/results?${params}`)
      const data = await res.json()
      if (mounted) setResults(data.results)
    }

    void load()

    return () => { mounted = false }
  }, [scanId, minScore, readOnly])

  async function patch(id: string, body: { leadStatus?: string; note?: string }) {
    if (readOnly) return
    await fetch(`/api/businesses/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    const params = new URLSearchParams()
    if (minScore > 0) params.set('minScore', String(minScore))
    const res = await fetch(`/api/scans/${scanId}/results?${params}`)
    const data = await res.json()
    setResults(data.results)
  }

  // Live mode: the server already applies minScore. Read-only mode has no server round trip, so filter locally.
  const byMinScore = readOnly ? results.filter(r => (r.score ?? 0) >= minScore) : results
  const visible = leadsOnly ? byMinScore.filter(r => r.presenceStatus !== 'alive') : byMinScore

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          Min score
          <select className={SELECT_CLS} value={minScore} onChange={e => setMinScore(Number(e.target.value))}>
            {MIN_SCORE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          <input type="checkbox" checked={leadsOnly} onChange={e => setLeadsOnly(e.target.checked)} className="accent-lime" />
          Leads only
        </label>
        <ScoreHistogram scores={visible.map(r => r.score)} />
        {readOnly ? (
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-lime">Self-host to run scans</span>
            <Button variant="ghost" disabled className="cursor-not-allowed opacity-40">Export CSV</Button>
          </div>
        ) : (
          <Button variant="ghost" href={`/api/scans/${scanId}/export`} className="ml-auto">Export CSV</Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-base">
            <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
              <th className="px-3 py-2 text-left font-normal">Score</th>
              <th className="px-3 py-2 text-left font-normal">Business</th>
              <th className="px-3 py-2 text-left font-normal">Presence</th>
              <th className="px-3 py-2 text-left font-normal">Available domains</th>
              <th className="px-3 py-2 text-left font-normal">Contact</th>
              <th className="px-3 py-2 text-left font-normal">Status</th>
              <th className="px-3 py-2 text-left font-normal">Note</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-3 py-2"><ScoreCell score={r.score} /></td>
                <td className="px-3 py-2">
                  <div className="text-text">{r.name}</div>
                  <div className="text-xs text-mute">
                    {r.address} {r.rating != null && <>· ★{r.rating} ({r.reviewCount})</>}
                  </div>
                </td>
                <td className="px-3 py-2"><PresenceBadge status={r.presenceStatus} /></td>
                <td className="px-3 py-2"><DomainChips domains={r.domains} /></td>
                <td className="px-3 py-2 text-xs text-dim">{r.phone}</td>
                <td className="px-3 py-2">
                  {readOnly
                    ? <span className="font-mono text-xs uppercase tracking-[0.08em] text-text">{r.leadStatus}</span>
                    : (
                      <select className={SELECT_CLS} value={r.leadStatus}
                        onChange={e => { void patch(r.id, { leadStatus: e.target.value }) }}>
                        {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                </td>
                <td className="px-3 py-2">
                  {readOnly
                    ? <span className="text-xs text-dim">{r.note ?? '—'}</span>
                    : (
                      <input className={INPUT_CLS} defaultValue={r.note ?? ''}
                        onBlur={e => { if (e.target.value !== (r.note ?? '')) void patch(r.id, { note: e.target.value }) }} />
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-4 text-sm text-mute">No results match the filters.</p>}
      </div>
    </div>
  )
}
