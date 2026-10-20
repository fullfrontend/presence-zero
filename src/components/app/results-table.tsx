'use client'
import ScanMap from './scan-map'
import { useI18n } from '@/i18n/client'
import type { AuditReport } from '@/core/audit/types'
import { useEffect, useState } from 'react'
import { Button } from '@/components/brand/button'
import { ScoreCell } from './score-cell'
import { PresenceBadge } from './presence-badge'
import { DomainChips } from './domain-chips'
import { ScoreHistogram } from './score-histogram'
import { Skeleton } from './skeleton'
import { Tour, type TourStep } from './tour'
import { EnrichmentStatus, type EnrichmentTask } from './enrichment-status'
import { LeadDetail } from './lead-detail'
import { ScanSummary } from './scan-summary'
import { buildExportQuery, isQualifiedLead, isPendingResult, type LeadStatus } from '@/lib/result-filters'

interface DomainInfo { domain: string; available: boolean | null }
interface Result {
  latitude?: number | null; longitude?: number | null
  id: string; name: string; address: string | null; phone: string | null
  rating: number | null; reviewCount: number | null; listedWebsite: string | null
  presenceStatus: string | null; probeDetail: string | null; score: number | null; leadStatus: string; note: string | null
  facebookUrl?: string | null; sourceUrl?: string | null
  category?: string | null; seenBefore?: boolean
  enrichment?: EnrichmentTask[]
  auditReport?: AuditReport | null
  domains: DomainInfo[]
}

const LEAD_STATUSES = ['new', 'contacted', 'replied', 'won', 'lost', 'skipped'] as const
const MIN_SCORE_OPTIONS = [0, 40, 60, 80]

const SELECT_CLS = 'rounded border border-line bg-surface px-2 py-1 font-mono text-xs text-text focus:border-lime/60 focus:outline-none'
const INPUT_CLS = 'w-36 rounded border border-line bg-surface px-2 py-1 text-xs text-text focus:border-lime/60 focus:outline-none'

type SortDir = 'asc' | 'desc'
type SortKey = 'score' | 'name' | 'presence' | 'domains' | 'phone' | 'status' | 'note'

const PRESENCE_RANK: Record<string, number> = { not_found: 0, dead: 1, parked: 2, facebook: 3, none: 4, alive: 5, probe_failed: 6 }
const STATUS_RANK: Record<string, number> = { new: 0, contacted: 1, replied: 2, won: 3, lost: 4, skipped: 5 }

interface Column {
  key: SortKey
  label: string
  defaultDir: SortDir
  value: (r: Result) => number | string | null
  tour?: string
}

const COLUMNS: Column[] = [
  { key: 'score', label: 'Lead score /100', defaultDir: 'desc', value: r => r.score, tour: 'score' },
  { key: 'name', label: 'Business', defaultDir: 'asc', value: r => r.name, tour: 'business' },
  { key: 'presence', label: 'Presence', defaultDir: 'asc', value: r => PRESENCE_RANK[r.presenceStatus ?? 'none'] ?? 0, tour: 'presence' },
  { key: 'domains', label: 'Available domains', defaultDir: 'desc', value: r => r.domains.filter(d => d.available === true).length, tour: 'domains' },
  { key: 'phone', label: 'Contact', defaultDir: 'asc', value: r => r.phone },
  { key: 'status', label: 'Status', defaultDir: 'asc', value: r => STATUS_RANK[r.leadStatus] ?? 0, tour: 'status' },
  { key: 'note', label: 'Note', defaultDir: 'asc', value: r => (r.note && r.note.trim() ? r.note : null), tour: 'note' },
]

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="score"]',
    title: 'Lead score (0–100)',
    body: 'Higher means a better prospect. The lime bar under each number shows the score at a glance; the list sorts by score by default.',
  },
  {
    selector: '[data-tour="presence"]',
    title: 'Web presence',
    body: 'How reachable the business’s site is. The dot encodes lead quality: NO SITE FOUND = no results after search, FACEBOOK = social presence, UNVERIFIED = incomplete or inconclusive verification. DEAD and PARKED remain separate website problems. A muted dot means ALIVE (check the local audit for website opportunities) or PROBE-FAILED.',
  },
  {
    selector: '[data-tour="domains"]',
    title: 'Available domains',
    body: 'Matching domains that are still registrable, RDAP-checked and shown as lime chips — the ones you can pitch to win the work.',
  },
  {
    selector: '[data-tour="status"]',
    title: 'Lead pipeline',
    body: 'Track each lead: new → contacted → replied → won or lost (or skipped). Update it inline, or select several rows and mark them in bulk.',
  },
  {
    selector: '[data-tour="note"]',
    title: 'Notes',
    body: 'Jot a quick note per lead; it saves automatically.',
  },
  {
    selector: '[data-tour="histogram"]',
    title: 'Score distribution',
    body: 'How your leads spread across score bands. Lime bars are leads; the violet bar is the low/alive bucket.',
  },
  {
    selector: '[data-tour="toolbar"]',
    title: 'Filter, sort, export',
    body: 'Filter by score, leads-only, phone, or pipeline status. Export downloads the rows you’re looking at — not the whole unfiltered scan.',
  },
]

function compareValues(a: number | string | null, b: number | string | null, dir: SortDir): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  const cmp = typeof a === 'number' ? a - (b as number) : a.localeCompare(b as string, undefined, { sensitivity: 'base' })
  return dir === 'asc' ? cmp : -cmp
}

export default function ResultsTable(
  { scanId, readOnly = false, initialResults, autoTour = false, location, refreshKey, partial = false }:
  {
    scanId: string
    readOnly?: boolean
    initialResults?: Result[]
    autoTour?: boolean
    location?: string | null
    refreshKey?: number
    partial?: boolean
  },
) {
  const { t, number } = useI18n()
  const [results, setResults] = useState<Result[]>(initialResults ?? [])
  const [minScore, setMinScore] = useState(0)
  const [auditOnly, setAuditOnly] = useState(false)
  const [leadsOnly, setLeadsOnly] = useState(true)
  const [hasPhoneOnly, setHasPhoneOnly] = useState(false)
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatus | ''>('')
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [tourOpen, setTourOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>("contacted")
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => {
    if (!autoTour) return
    const runOnce = () => {
      try {
        if (!window.localStorage.getItem('pz-demo-tour-seen')) {
          setTourOpen(true)
          window.localStorage.setItem('pz-demo-tour-seen', '1')
        }
      } catch {
        // localStorage unavailable — skip auto-run silently.
      }
    }
    runOnce()
  }, [autoTour])

  useEffect(() => {
    if (readOnly) return
    let mounted = true

    const load = async (soft: boolean) => {
      if (!soft) setLoading(true)
      const params = new URLSearchParams()

      const res = await fetch(`/api/scans/${scanId}/results?${params}`)
      const data = await res.json()
      if (mounted) {
        setResults(data.results)
        setLoading(false)
      }
    }

    void load(results.length > 0 && refreshKey != null)

    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- soft reload when refreshKey ticks; avoid resetting selection thrash
  }, [scanId, readOnly, refreshKey])

  async function reload() {
    const params = new URLSearchParams()

    const res = await fetch(`/api/scans/${scanId}/results?${params}`)
    const data = await res.json()
    setResults(data.results)
  }

  async function patch(id: string, body: { leadStatus?: string; note?: string }) {
    if (readOnly) return
    await fetch(`/api/businesses/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    await reload()
  }

  async function applyBulkStatus() {
    if (readOnly || selected.size === 0) return
    setBulkBusy(true)
    try {
      await fetch('/api/businesses/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], leadStatus: bulkStatus }),
      })
      setSelected(new Set())
      await reload()
    } finally {
      setBulkBusy(false)
    }
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(COLUMNS.find(c => c.key === key)?.defaultDir ?? 'asc')
    }
  }

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const byMinScore = results.filter(r => (r.score ?? 0) >= minScore)
  const byAudit = auditOnly ? byMinScore.filter(r => r.auditReport?.status === "complete" && r.auditReport.mode === 'website') : byMinScore
  const byLeads = leadsOnly ? byAudit.filter(row => isPendingResult(row) || isQualifiedLead(row)) : byAudit
  const byPhone = hasPhoneOnly ? byLeads.filter(r => r.phone) : byLeads
  const visible = leadStatusFilter ? byPhone.filter(r => r.leadStatus === leadStatusFilter) : byPhone
  const activeColumn = COLUMNS.find(c => c.key === sortKey) ?? COLUMNS[0]
  const sorted = [...visible].sort((a, b) => compareValues(activeColumn.value(a), activeColumn.value(b), sortDir))
  const exportHref = `/api/scans/${scanId}/export${buildExportQuery({
    minScore,
    auditOnly,
    leadsOnly,
    hasPhoneOnly,
    leadStatus: leadStatusFilter,
  })}`

  const allVisibleSelected = sorted.length > 0 && sorted.every(r => selected.has(r.id))
  const colCount = COLUMNS.length + (readOnly ? 0 : 1)

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        for (const r of sorted) next.delete(r.id)
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        for (const r of sorted) next.add(r.id)
        return next
      })
    }
  }

  return (
    <div className="space-y-3">
      {!readOnly && <ScanMap results={results} location={location} />}
      {partial && (
        <p className="text-xs text-dim">{t("Some rows may still be processing — scores and domains fill in as the scan advances.")}</p>
      )}
      <ScanSummary results={results} />
      <div data-tour="toolbar" className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          {t("Min score")}<select className={SELECT_CLS} value={minScore} onChange={e => setMinScore(Number(e.target.value))}>
            {MIN_SCORE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          <input type="checkbox" checked={leadsOnly} onChange={e => setLeadsOnly(e.target.checked)} className="accent-lime" />
          {t("Leads only")}</label>
        {results.some(r => r.auditReport) && <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          <input type="checkbox" checked={auditOnly} onChange={e => { setAuditOnly(e.target.checked); setMinScore(0) }} className="accent-lime" />
          {t("Audited websites only")}</label>}
        <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          <input type="checkbox" checked={hasPhoneOnly} onChange={e => setHasPhoneOnly(e.target.checked)} className="accent-lime" />
          {t("Has phone only")}</label>
        <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          {t("Status")}<select
            className={SELECT_CLS}
            value={leadStatusFilter}
            onChange={e => setLeadStatusFilter(e.target.value as LeadStatus | '')}
          >
            <option value="">{t("All")}</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </label>
        {visible.length >= 2 && (
          <div data-tour="histogram">
            <ScoreHistogram scores={visible.map(r => r.score)} />
          </div>
        )}
        <Button variant="ghost" onClick={() => setTourOpen(true)} className="px-3 py-1.5 text-xs">{t("? Tour")}</Button>
        {readOnly ? (
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-lime">{t("Self-host to run scans")}</span>
            <Button variant="ghost" disabled className="cursor-not-allowed opacity-40">{t("Export CSV")}</Button>
          </div>
        ) : (
          <Button variant="ghost" href={exportHref} className="ml-auto">{t("Export CSV")}</Button>
        )}
      </div>

      {!readOnly && sorted.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface/60 px-3 py-2">
          <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="accent-lime"
            />
            {t("Select visible (")}{sorted.length})
          </label>
          {selected.size > 0 && (
            <>
              <span className="font-mono text-[11px] text-dim">{selected.size} {t(" selected")}</span>
              <select
                className={SELECT_CLS}
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value as LeadStatus)}
                aria-label={t("Bulk lead status")}
              >
                {LEAD_STATUSES.map(s => <option key={s} value={s}>{t(s)}</option>)}
              </select>
              <Button variant="ghost" className="px-3 py-1.5 text-xs" disabled={bulkBusy} onClick={() => { void applyBulkStatus() }}>
                {bulkBusy ? t("Updating…") : t("Mark as {0}", { 0: t(bulkStatus) })}
              </Button>
              <button
                type="button"
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute hover:text-text"
                onClick={() => setSelected(new Set())}
              >
                {t("Clear")}</button>
            </>
          )}
        </div>
      )}

      <Tour steps={TOUR_STEPS} open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-base">
            <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
              {!readOnly && (
                <th className="w-8 px-2 py-2">
                  <span className="sr-only">{t("Select")}</span>
                </th>
              )}
              {COLUMNS.map(col => {
                const active = col.key === sortKey
                return (
                  <th
                    key={col.key}
                    data-tour={col.tour}
                    className="px-3 py-2 text-left font-normal"
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mute hover:text-text"
                    >
                      {t(col.label)}
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
                  {!readOnly && <td className="px-2 py-2" />}
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
            ) : sorted.flatMap(r => {
              const open = expandedId === r.id
              const detailId = `lead-detail-${r.id}`
              return [
                <tr key={r.id} className="border-t border-line align-top">
                  {!readOnly && (
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelected(r.id)}
                        className="accent-lime"
                        aria-label={t("Select {0}", { 0: r.name })}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : r.id)}
                      aria-expanded={open}
                      aria-controls={detailId}
                      title={open ? t("Hide breakdown & pitch") : t("Show breakdown & pitch")}
                      className="flex items-start gap-1 rounded text-left hover:opacity-90 focus-visible:outline focus-visible:outline-lime/60"
                    >
                      <ScoreCell score={r.score} />
                      <span aria-hidden="true" className={`mt-0.5 text-[10px] text-mute transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-text">
                      <span className="min-w-0">{r.name}</span>
                      {r.seenBefore && (
                        <span title={t("This business appeared in an earlier scan of the same area")} className="shrink-0 whitespace-nowrap rounded border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-mute">{t("seen before")}</span>
                      )}
                    </div>
                    <div className="text-xs text-mute">
                      {r.address} {r.rating != null && <>· ★{number(r.rating)} ({r.reviewCount == null ? '—' : number(r.reviewCount)})</>}
                    </div>
                  </td>
                  <td className="px-3 py-2"><PresenceBadge status={r.presenceStatus} website={r.listedWebsite} detail={r.probeDetail} /><EnrichmentStatus tasks={r.enrichment} compact /></td>
                  <td className="px-3 py-2"><DomainChips domains={r.domains} /></td>
                  <td className="px-3 py-2 text-xs text-dim">{r.phone}</td>
                  <td className="px-3 py-2">
                    {readOnly
                      ? <span className="font-mono text-xs uppercase tracking-[0.08em] text-text">{t(r.leadStatus)}</span>
                      : (
                        <select className={SELECT_CLS} value={r.leadStatus}
                          onChange={e => { void patch(r.id, { leadStatus: e.target.value }) }}>
                          {LEAD_STATUSES.map(s => <option key={s} value={s}>{t(s)}</option>)}
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
                </tr>,
                open && (
                  <tr key={`${r.id}-detail`} className="border-t border-line/50 bg-base/20">
                    <td colSpan={colCount} id={detailId} className="px-3 py-3">
                      <EnrichmentStatus tasks={r.enrichment} />
                      <LeadDetail row={r} location={location} />
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>
        {!loading && visible.length === 0 && (
          <div className="p-4 text-sm text-dim">
            {results.length === 0
              ? (partial ? t("Waiting for the first processed leads…") : t("No businesses in this scan yet."))
              : (
                <>
                  {t("No results match the current filters.")}<span className="text-mute"> {t(" Try lowering ")}<span className="text-text">{t("Min score")}</span>{leadsOnly && <> {t(" or turning off ")}<span className="text-text">{t("Leads only")}</span></>}{hasPhoneOnly && <> {t(" or ")}<span className="text-text">{t("Has phone only")}</span></>}{leadStatusFilter && <> {t(" or clearing ")}<span className="text-text">{t("Status")}</span></>}.</span>
                </>
              )}
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading && visible.length === 0 && (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`ms-${i}`} className="rounded-xl border border-line bg-surface p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
          ))
        )}
        {!loading && visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-line p-4 text-sm text-dim">
            {results.length === 0
              ? (partial ? t("Waiting for the first processed leads…") : t("No businesses in this scan yet."))
              : t("No results match the current filters.")}
          </div>
        )}
        {sorted.map(r => {
          const open = expandedId === r.id
          return (
            <article key={r.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                {!readOnly && (
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleSelected(r.id)}
                    className="mt-1 accent-lime"
                    aria-label={t("Select {0}", { 0: r.name })}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : r.id)}
                      className="flex items-center gap-2 text-left"
                    >
                      <ScoreCell score={r.score} />
                      <span className="font-medium text-text">{r.name}</span>
                    </button>
                    <PresenceBadge status={r.presenceStatus} website={r.listedWebsite} detail={r.probeDetail} /><EnrichmentStatus tasks={r.enrichment} compact />
                  </div>
                  <p className="mt-1 text-xs text-mute">
                    {r.address} {r.rating != null && <>· ★{number(r.rating)} ({r.reviewCount == null ? '—' : number(r.reviewCount)})</>}
                  </p>
                  {r.phone && <p className="mt-1 text-xs text-dim">{r.phone}</p>}
                  <div className="mt-2"><DomainChips domains={r.domains} /></div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {readOnly
                      ? <span className="font-mono text-xs uppercase tracking-[0.08em] text-text">{t(r.leadStatus)}</span>
                      : (
                        <select className={SELECT_CLS} value={r.leadStatus}
                          onChange={e => { void patch(r.id, { leadStatus: e.target.value }) }}>
                          {LEAD_STATUSES.map(s => <option key={s} value={s}>{t(s)}</option>)}
                        </select>
                      )}
                    {!readOnly && (
                      <input className={`${INPUT_CLS} w-full max-w-none flex-1`} defaultValue={r.note ?? ''} placeholder={t("Note")}
                        onBlur={e => { if (e.target.value !== (r.note ?? '')) void patch(r.id, { note: e.target.value }) }} />
                    )}
                  </div>
                  {open && (
                    <div className="mt-3 border-t border-line pt-3">
                      <EnrichmentStatus tasks={r.enrichment} />
                      <LeadDetail row={r} location={location} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : r.id)}
                    className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-lime"
                  >
                    {open ? t("Hide score & pitch") : t("Score & pitch")}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
