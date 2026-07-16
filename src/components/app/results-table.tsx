'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/brand/button'
import { ScoreCell } from './score-cell'
import { PresenceBadge } from './presence-badge'
import { DomainChips } from './domain-chips'
import { ScoreHistogram } from './score-histogram'
import { Skeleton } from './skeleton'

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

type SortDir = 'asc' | 'desc'
type SortKey = 'score' | 'name' | 'presence' | 'domains' | 'phone' | 'status' | 'note'

// Lead-quality rank: leads group together, best leads first (ascending).
const PRESENCE_RANK: Record<string, number> = { none: 0, dead: 1, parked: 2, probe_failed: 3, alive: 4 }
// Lead-pipeline rank: follows the natural progression of a lead.
const STATUS_RANK: Record<string, number> = { new: 0, contacted: 1, replied: 2, won: 3, lost: 4, skipped: 5 }

interface Column {
  key: SortKey
  label: string
  defaultDir: SortDir
  value: (r: Result) => number | string | null
}

const COLUMNS: Column[] = [
  { key: 'score', label: 'Score', defaultDir: 'desc', value: r => r.score },
  { key: 'name', label: 'Business', defaultDir: 'asc', value: r => r.name },
  { key: 'presence', label: 'Presence', defaultDir: 'asc', value: r => PRESENCE_RANK[r.presenceStatus ?? 'none'] ?? 0 },
  { key: 'domains', label: 'Available domains', defaultDir: 'desc', value: r => r.domains.filter(d => d.available === true).length },
  { key: 'phone', label: 'Contact', defaultDir: 'asc', value: r => r.phone },
  { key: 'status', label: 'Status', defaultDir: 'asc', value: r => STATUS_RANK[r.leadStatus] ?? 0 },
  { key: 'note', label: 'Note', defaultDir: 'asc', value: r => (r.note && r.note.trim() ? r.note : null) },
]

// Nulls always sort last, regardless of direction; only the substantive comparison flips with dir.
function compareValues(a: number | string | null, b: number | string | null, dir: SortDir): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  const cmp = typeof a === 'number' ? a - (b as number) : a.localeCompare(b as string, undefined, { sensitivity: 'base' })
  return dir === 'asc' ? cmp : -cmp
}

export default function ResultsTable(
  { scanId, readOnly = false, initialResults }:
  { scanId: string; readOnly?: boolean; initialResults?: Result[] },
) {
  const [results, setResults] = useState<Result[]>(initialResults ?? [])
  const [minScore, setMinScore] = useState(0)
  const [leadsOnly, setLeadsOnly] = useState(true)
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    if (readOnly) return
    let mounted = true

    const load = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (minScore > 0) params.set('minScore', String(minScore))
      const res = await fetch(`/api/scans/${scanId}/results?${params}`)
      const data = await res.json()
      if (mounted) {
        setResults(data.results)
        setLoading(false)
      }
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

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(COLUMNS.find(c => c.key === key)?.defaultDir ?? 'asc')
    }
  }

  // Live mode: the server already applies minScore. Read-only mode has no server round trip, so filter locally.
  const byMinScore = readOnly ? results.filter(r => (r.score ?? 0) >= minScore) : results
  const visible = leadsOnly ? byMinScore.filter(r => r.presenceStatus !== 'alive') : byMinScore
  const activeColumn = COLUMNS.find(c => c.key === sortKey) ?? COLUMNS[0]
  const sorted = [...visible].sort((a, b) => compareValues(activeColumn.value(a), activeColumn.value(b), sortDir))

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
              {COLUMNS.map(col => {
                const active = col.key === sortKey
                return (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left font-normal"
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mute hover:text-text"
                    >
                      {col.label}
                      {active && <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading && visible.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-t border-line align-top">
                  <td className="px-3 py-2"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1.5 h-3 w-24" />
                  </td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-28" /></td>
                </tr>
              ))
            ) : sorted.map(r => (
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
        {!loading && visible.length === 0 && <p className="p-4 text-sm text-dim">No results match the filters.</p>}
      </div>
    </div>
  )
}
