'use client'
import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type * as Leaflet from 'leaflet'
import { useI18n } from '@/i18n/client'
import { coordinates } from '@/core/coordinates'
import type { ExplainableRow } from '@/lib/score-explain'
import { LeadDetail } from './lead-detail'
import { EnrichmentStatus, type EnrichmentTask } from './enrichment-status'
import { PresenceBadge } from './presence-badge'

interface MapBusiness extends ExplainableRow {
  id: string; address: string | null
  latitude?: number | null; longitude?: number | null
  enrichment?: EnrichmentTask[]
}

export default function ScanMap({ results, location }: { results: MapBusiness[]; location?: string | null }) {
  const { t, number } = useI18n()
  const host = useRef<HTMLDivElement>(null)
  const instance = useRef<{ map: Leaflet.Map; layer: Leaflet.LayerGroup; library: typeof Leaflet } | null>(null)
  const fitted = useRef(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selection, setSelection] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const eligible = results.filter(row => row.score !== null && Number.isFinite(row.score) && row.score >= 50)
  const points = eligible.flatMap(row => {
    const point = coordinates(row.latitude, row.longitude)
    return point.latitude === undefined ? [] : [{ id: row.id, name: row.name, score: row.score!, lat: point.latitude, lng: point.longitude! }]
  })
  // Rebuild only when visible points change, including crossing the score threshold.
  const pointKey = JSON.stringify(points)
  const selected = eligible.find(row => row.id === selectedId)
  const visibleSelection = eligible.filter(row => selection.includes(row.id))

  useEffect(() => {
    let disposed = false
    let observer: ResizeObserver | undefined
    void import('leaflet').then(library => {
      if (disposed || !host.current) return
      const map = library.map(host.current, { scrollWheelZoom: false }).setView([20, 0], 2)
      library.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).on('tileerror', () => { if (!disposed) setFailed(true) }).addTo(map)
      instance.current = { map, layer: library.layerGroup().addTo(map), library }
      observer = new ResizeObserver(() => map.invalidateSize())
      observer.observe(host.current)
      setReady(true)
    }).catch(() => { if (!disposed) setFailed(true) })
    return () => { disposed = true; observer?.disconnect(); instance.current?.map.remove(); instance.current = null; fitted.current = false }
  }, [])

  useEffect(() => {
    const current = instance.current
    if (!ready || !current) return
    const { map, layer, library } = current
    layer.clearLayers()
    const rows = JSON.parse(pointKey) as typeof points
    const groups = new Map<string, typeof points>()
    for (const row of rows) {
      const key = `${row.lat},${row.lng}`
      groups.set(key, [...(groups.get(key) ?? []), row])
    }
    for (const group of groups.values()) {
      const point = group[0]
      const scores = group.map(row => row.score)
      const minimum = Math.min(...scores), maximum = Math.max(...scores)
      const scoreLabel = minimum === maximum ? String(maximum) : `${minimum}–${maximum}`
      const label = group.map(row => `${row.name}: ${row.score}/100`).join(' · ')
      const width = minimum === maximum ? 40 : 68
      const marker = library.marker([point.lat, point.lng], {
        title: label,
        alt: label,
        icon: library.divIcon({ className: 'scan-map-pin', html: `<span style="width:${width}px">${scoreLabel}</span>${group.length > 1 ? `<small>${group.length}</small>` : ''}`, iconSize: [width, 40], iconAnchor: [width / 2, 40] }),
      }).addTo(layer)
      marker.getElement()?.setAttribute('aria-label', label)
      marker.on('click', () => { setSelection(group.map(row => row.id)); setSelectedId(point.id) })
    }
    if (!fitted.current && rows.length) {
      map.fitBounds(rows.map(row => [row.lat, row.lng] as Leaflet.LatLngTuple), { padding: [30, 30], maxZoom: 15 })
      fitted.current = true
    }
  }, [ready, pointKey])

  function fitAll() {
    instance.current?.map.fitBounds(points.map(point => [point.lat, point.lng] as Leaflet.LatLngTuple), { padding: [30, 30], maxZoom: 15 })
  }

  return <section className="overflow-hidden rounded-xl border border-line" aria-label={t('Business map')}>
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div><h2 className="text-sm font-medium">{t('Business map')}</h2>
        <p className="mt-1 text-xs text-mute">{t('{0} of {1} businesses scoring 50+ located', { 0: number(points.length), 1: number(eligible.length) })} · {t('Scores out of 100. Grouped pins show the score range.')}</p></div>
      <button type="button" disabled={!ready || !points.length} onClick={fitAll} className="rounded border border-line px-3 py-2 text-xs disabled:opacity-40">{t('Show all pins')}</button>
    </div>
    <div ref={host} className="relative z-0 h-80 bg-surface sm:h-96" aria-label={t('OpenStreetMap business locations')} />
    {failed && <p className="p-4 text-sm text-amber-400" role="alert">{t('The map could not load. Business details remain available in the list.')}</p>}
    {eligible.length === 0 && <p className="border-t border-line p-4 text-xs text-mute">{t('No businesses with a score of 50 or more yet.')}</p>}
    {points.length < eligible.length && <p className="border-t border-line p-4 text-xs text-mute">{t('Some results have no coordinates. Older scans must be rerun to collect locations; CSV imports can include latitude and longitude.')}</p>}
    {selected && <div className="border-t border-line p-4 sm:p-6" aria-label={t('Selected business')}>
      {visibleSelection.length > 1 && <div className="mb-4 flex flex-wrap gap-2" aria-label={t('Businesses at this location')}>
        {visibleSelection.map(row => <button key={row.id} type="button" aria-pressed={selectedId === row.id} onClick={() => setSelectedId(row.id)} className={`rounded border px-3 py-2 text-xs ${selectedId === row.id ? 'border-lime text-lime' : 'border-line'}`}>{row.name} · {row.score}/100</button>)}
      </div>}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h3 className="font-medium">{selected.name}</h3><p className="mt-1 text-sm text-dim">{selected.address}</p>
          {selected.phone && <p className="mt-1 text-sm text-dim">{selected.phone}</p>}
          <div className="mt-2"><PresenceBadge status={selected.presenceStatus} /></div></div>
        <button type="button" onClick={() => setSelectedId(null)} className="rounded border border-line px-3 py-2 text-xs">{t('Close')}</button>
      </div>
      <EnrichmentStatus tasks={selected.enrichment} />
      <LeadDetail key={selected.id} row={selected} location={location} />
    </div>}
  </section>
}
