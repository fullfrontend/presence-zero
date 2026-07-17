'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type PastScan = {
  id: string
  createdAt: number
  location: string
  category: string
  countryCode: string
  provider: string
  providerConfig: string | null
  status: string
  totalFound: number
  pinned: boolean
  archived: boolean
  label: string | null
  title: string | null
  leadCount: number
}

type Patchable = Pick<PastScan, 'pinned' | 'archived' | 'label' | 'title'>

function csvContentFor(s: PastScan): string | undefined {
  if (s.provider !== 'csv') return undefined
  try {
    const cfg = JSON.parse(s.providerConfig || '{}')
    return typeof cfg.csvContent === 'string' && cfg.csvContent.length > 0 ? cfg.csvContent : undefined
  } catch {
    return undefined
  }
}

const microLabel = 'font-mono text-[10px] uppercase tracking-[0.14em]'
const actionBtn = `${microLabel} rounded border border-line px-2 py-1 text-mute transition-colors hover:border-lime/40 hover:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-mute`

export default function PastScans({ scans: initialScans }: { scans: PastScan[] }) {
  const router = useRouter()
  const [scans, setScans] = useState<PastScan[]>(initialScans)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function flashError(id: string, message: string) {
    setErrors(e => ({ ...e, [id]: message }))
    setTimeout(() => setErrors(e => {
      if (!(id in e)) return e
      const next = { ...e }
      delete next[id]
      return next
    }), 4000)
  }

  function patchScan(id: string, body: Partial<Patchable>) {
    const previous = scans
    setScans(cur => cur.map(s => (s.id === id ? { ...s, ...body } : s)))
    setBusyId(id)
    fetch(`/api/scans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Update failed')
        }
      })
      .catch(err => {
        setScans(previous)
        flashError(id, err instanceof Error ? err.message : 'Update failed')
      })
      .finally(() => setBusyId(cur => (cur === id ? null : cur)))
  }

  function togglePin(s: PastScan) {
    patchScan(s.id, { pinned: !s.pinned })
  }

  function toggleArchive(s: PastScan) {
    patchScan(s.id, { archived: !s.archived })
  }

  function startEditLabel(s: PastScan) {
    setEditingLabelId(s.id)
    setLabelDraft(s.label ?? '')
  }

  function commitLabel(s: PastScan) {
    setEditingLabelId(null)
    const value = labelDraft.trim().slice(0, 100)
    if (value === (s.label ?? '')) return
    patchScan(s.id, { label: value || null })
  }

  function startEditTitle(s: PastScan) {
    setEditingTitleId(s.id)
    setTitleDraft(s.title ?? '')
  }

  function commitTitle(s: PastScan) {
    setEditingTitleId(null)
    const value = titleDraft.trim().slice(0, 200)
    if (value === (s.title ?? '')) return
    patchScan(s.id, { title: value || null })
  }

  async function rerun(s: PastScan) {
    const csvContent = csvContentFor(s)
    if (s.provider === 'csv' && !csvContent) return
    setBusyId(s.id)
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: s.location,
          category: s.category,
          countryCode: s.countryCode,
          provider: s.provider,
          csvContent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start scan')
      router.push(`/app/scans/${data.id}`)
    } catch (err) {
      flashError(s.id, err instanceof Error ? err.message : 'Failed to start scan')
      setBusyId(cur => (cur === s.id ? null : cur))
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scans
      .filter(s => showArchived || !s.archived)
      .filter(s => {
        if (!q) return true
        const title = s.title || `${s.category} in ${s.location}`
        return [s.location, s.category, s.label ?? '', title].some(v => v.toLowerCase().includes(q))
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.createdAt - a.createdAt
      })
  }, [scans, search, showArchived])

  const archivedCount = scans.filter(s => s.archived).length

  if (scans.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-line bg-surface/40 p-6">
        <p className="text-sm text-text">No scans yet — run your first one above.</p>
        <ol className="mt-3 space-y-1.5 text-xs text-dim">
          <li><span className="text-lime">1.</span> Pick a location + category and a data source (OpenStreetMap needs no key).</li>
          <li><span className="text-lime">2.</span> PresenceZero probes each site, checks matching domains, and scores every lead 0–100.</li>
          <li><span className="text-lime">3.</span> Work the sorted list — expand a row for its score breakdown and a ready outreach angle.</li>
        </ol>
        <p className="mt-3 text-xs text-mute">New here? Try an example preset in the form above, or explore the <a href="/demo" className="text-lime underline-offset-4 hover:underline">read-only demo</a>.</p>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex-1 min-w-[200px]">
          <span className="sr-only">Search past scans</span>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search location, category, label…"
            className="w-full rounded-md border border-line bg-base/60 px-3 py-2 text-sm text-text placeholder:text-mute"
          />
        </label>
        {archivedCount > 0 && (
          <label className={`flex items-center gap-2 ${microLabel} text-mute`}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="h-3.5 w-3.5 accent-lime"
            />
            Show archived ({archivedCount})
          </label>
        )}
      </div>

      {visible.length === 0 && <p className="mt-4 text-sm text-dim">No scans match your search.</p>}

      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
        {visible.map(s => {
          const defaultTitle = `${s.category} in ${s.location}`
          const rerunDisabled = busyId === s.id || (s.provider === 'csv' && !csvContentFor(s))
          return (
            <li
              key={s.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/app/scans/${s.id}`)}
              onKeyDown={e => {
                if (e.key === 'Enter') router.push(`/app/scans/${s.id}`)
              }}
              className={`group flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-surface ${
                s.archived ? 'opacity-50' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {s.pinned && (
                    <span className="text-lime" aria-hidden="true" title="Pinned">★</span>
                  )}
                  {editingTitleId === s.id ? (
                    <label onClick={e => e.stopPropagation()}>
                      <span className="sr-only">Rename scan</span>
                      <input
                        autoFocus
                        value={titleDraft}
                        maxLength={200}
                        onChange={e => setTitleDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitTitle(s)
                          if (e.key === 'Escape') setEditingTitleId(null)
                        }}
                        onBlur={() => commitTitle(s)}
                        className="rounded border border-line bg-base/60 px-2 py-1 text-sm text-text"
                      />
                    </label>
                  ) : (
                    <span className="truncate text-text">{s.title || defaultTitle}</span>
                  )}
                  {editingLabelId === s.id ? (
                    <label onClick={e => e.stopPropagation()}>
                      <span className="sr-only">Edit label</span>
                      <input
                        autoFocus
                        value={labelDraft}
                        maxLength={100}
                        onChange={e => setLabelDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitLabel(s)
                          if (e.key === 'Escape') setEditingLabelId(null)
                        }}
                        onBlur={() => commitLabel(s)}
                        className={`${microLabel} rounded border border-line bg-base/60 px-2 py-1 text-text`}
                      />
                    </label>
                  ) : s.label ? (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        startEditLabel(s)
                      }}
                      className={`${microLabel} rounded-full border border-lime/40 bg-lime/10 px-2 py-0.5 text-lime`}
                    >
                      {s.label}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        startEditLabel(s)
                      }}
                      className={`${microLabel} rounded-full border border-line px-2 py-0.5 text-mute opacity-0 transition-opacity hover:text-text group-hover:opacity-100 focus:opacity-100`}
                    >
                      + label
                    </button>
                  )}
                </div>
                <p className={`mt-1 ${microLabel} text-mute`}>
                  {s.leadCount} leads · {s.totalFound} found
                </p>
                {errors[s.id] && <p className="mt-1 text-[11px] text-red-400">{errors[s.id]}</p>}
              </div>

              <div className="flex items-center gap-2">
                <span className={`${microLabel} text-mute`}>{s.status}</span>
                <div
                  className="flex flex-wrap items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => togglePin(s)}
                    disabled={busyId === s.id}
                    className={`${actionBtn} ${s.pinned ? 'border-lime/40 text-lime' : ''}`}
                  >
                    {s.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditTitle(s)}
                    disabled={busyId === s.id}
                    className={actionBtn}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleArchive(s)}
                    disabled={busyId === s.id}
                    className={actionBtn}
                  >
                    {s.archived ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => rerun(s)}
                    disabled={rerunDisabled}
                    title={
                      s.provider === 'csv' && !csvContentFor(s)
                        ? "This scan's CSV content wasn't stored, so it can't be re-run."
                        : undefined
                    }
                    className={actionBtn}
                  >
                    Re-run
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
