'use client'
import { useEffect, useState } from 'react'

interface DomainInfo { domain: string; available: boolean | null }
interface Result {
  id: string; name: string; address: string | null; phone: string | null
  rating: number | null; reviewCount: number | null; listedWebsite: string | null
  presenceStatus: string | null; score: number | null; leadStatus: string; note: string | null
  domains: DomainInfo[]
}

const LEAD_STATUSES = ['new', 'contacted', 'replied', 'won', 'lost', 'skipped'] as const
const PRESENCE_BADGE: Record<string, string> = {
  none: 'bg-emerald-100 text-emerald-800', dead: 'bg-amber-100 text-amber-800',
  parked: 'bg-orange-100 text-orange-800', alive: 'bg-zinc-100 text-zinc-500',
  probe_failed: 'bg-red-100 text-red-700',
}

export default function ResultsTable({ scanId }: { scanId: string }) {
  const [results, setResults] = useState<Result[]>([])
  const [minScore, setMinScore] = useState(0)
  const [leadsOnly, setLeadsOnly] = useState(true)

  useEffect(() => {
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
  }, [scanId, minScore])

  async function patch(id: string, body: { leadStatus?: string; note?: string }) {
    await fetch(`/api/businesses/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    const params = new URLSearchParams()
    if (minScore > 0) params.set('minScore', String(minScore))
    const res = await fetch(`/api/scans/${scanId}/results?${params}`)
    const data = await res.json()
    setResults(data.results)
  }

  const visible = leadsOnly ? results.filter(r => r.presenceStatus !== 'alive') : results

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label>Min score{' '}
          <select className="rounded border px-2 py-1" value={minScore} onChange={e => setMinScore(Number(e.target.value))}>
            {[0, 40, 60, 80].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={leadsOnly} onChange={e => setLeadsOnly(e.target.checked)} />
          Leads only (hide alive sites)
        </label>
        <a href={`/api/scans/${scanId}/export`} className="ml-auto rounded border px-3 py-1.5 hover:bg-zinc-50">
          Export CSV
        </a>
      </div>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Score</th><th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Presence</th><th className="px-3 py-2">Available domains</th>
              <th className="px-3 py-2">Contact</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map(r => (
              <tr key={r.id} className="align-top">
                <td className="px-3 py-2 font-bold">{r.score ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-zinc-500">
                    {r.address} {r.rating != null && <>· ★{r.rating} ({r.reviewCount})</>}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${PRESENCE_BADGE[r.presenceStatus ?? ''] ?? ''}`}>
                    {r.presenceStatus}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {r.domains.filter(d => d.available === true).map(d => (
                    <span key={d.domain} className="mr-1 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">{d.domain}</span>
                  ))}
                </td>
                <td className="px-3 py-2 text-xs">{r.phone}</td>
                <td className="px-3 py-2">
                  <select className="rounded border px-1.5 py-1 text-xs" value={r.leadStatus}
                    onChange={e => { void patch(r.id, { leadStatus: e.target.value }) }}>
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input className="w-36 rounded border px-1.5 py-1 text-xs" defaultValue={r.note ?? ''}
                    onBlur={e => { if (e.target.value !== (r.note ?? '')) void patch(r.id, { note: e.target.value }) }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-4 text-sm text-zinc-500">No results match the filters.</p>}
      </div>
    </div>
  )
}
