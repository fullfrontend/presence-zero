import type { AuditReport } from '@/core/audit/types'
import { isQualifiedLead } from '@/lib/result-filters'
import { presenceMeta } from '@/lib/presence'

interface SummaryRow {
  auditReport?: AuditReport | null
  presenceStatus: string | null
  score: number | null
  domains: { domain: string; available: boolean | null }[]
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums text-text">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-dim">{hint}</div>}
    </div>
  )
}

const PRESENCE_ORDER = ['not_found', 'facebook', 'none', 'alive', 'dead', 'parked', 'probe_failed'] as const

/**
 * Scan-level insight row. Computed client-side from the loaded results, so it works
 * identically live and in the read-only demo. Stat tiles (a single lime accent + text
 * tokens) rather than a chart — the data's job here is headline magnitude, not comparison.
 */
export function ScanSummary({ results }: { results: SummaryRow[] }) {
  if (results.length < 2) return null

  const leads = results.filter(isQualifiedLead)
  const leadScores = leads.map(r => r.score ?? 0)
  const avgScore = leadScores.length ? Math.round(leadScores.reduce((a, b) => a + b, 0) / leadScores.length) : 0
  const withDomain = leads.filter(r => r.domains.some(d => d.available === true)).length

  const counts = new Map<string, number>()
  for (const r of results) {
    const key = presenceMeta(r.presenceStatus).key
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const mix = PRESENCE_ORDER.map(key => ({ key, meta: presenceMeta(key), count: counts.get(key) ?? 0 })).filter(m => m.count > 0)

  return (
    <section aria-label="Scan summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat value={String(leads.length)} label="Leads" hint={`of ${results.length} found`} />
      <Stat value={String(avgScore)} label="Avg lead score" hint="0–100" />
      <Stat value={String(withDomain)} label="Domains free" hint="matching .com/ccTLD" />
      <div className="col-span-2 rounded-lg border border-line bg-surface px-4 py-3 sm:col-span-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Presence</div>
        <ul className="mt-1.5 space-y-1">
          {mix.map(m => (
            <li key={m.key} className="flex items-center justify-between gap-2 text-[11px]">
              <span className={`flex items-center gap-1.5 ${m.meta.isLead ? 'text-dim' : 'text-mute'}`}>
                <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${m.meta.isLead ? 'bg-lime' : 'bg-mute/50'}`} />
                {m.meta.label}
              </span>
              <span className="font-mono tabular-nums text-mute">{m.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
