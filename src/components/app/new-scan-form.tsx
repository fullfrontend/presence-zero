'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/brand/button'
import { SUPPORTED_OSM_CATEGORIES } from '@/core/providers/osm-categories'

const LAST_SCAN_KEY = 'pz-last-scan'

type LastScan = {
  location: string
  category: string
  countryCode: string
  provider: 'google' | 'osm' | 'csv' | 'apify'
  maxPlaces?: number
}

function readLastScan(): LastScan | null {
  try {
    const raw = localStorage.getItem(LAST_SCAN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastScan
    if (!parsed.location || !parsed.category || !parsed.countryCode || !parsed.provider) return null
    return parsed
  } catch {
    return null
  }
}

function writeLastScan(data: LastScan) {
  try {
    localStorage.setItem(LAST_SCAN_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export default function NewScanForm() {
  const router = useRouter()
  const [provider, setProvider] = useState<'google' | 'osm' | 'csv' | 'apify'>('osm')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [countryCode, setCountryCode] = useState('us')
  const [csvContent, setCsvContent] = useState('')
  const [maxPlaces, setMaxPlaces] = useState(50)
  const [hasApifyToken, setHasApifyToken] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hasGoogleKey, setHasGoogleKey] = useState<boolean | null>(null)
  const [lastScan, setLastScan] = useState<LastScan | null>(() => {
    if (typeof window === 'undefined') return null
    return readLastScan()
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        setHasGoogleKey(Boolean(data.googleApiKey))
        setHasApifyToken(Boolean(data.apifyToken))
      })
      .catch(() => { if (!cancelled) { setHasGoogleKey(null); setHasApifyToken(null) } })
    return () => { cancelled = true }
  }, [])

  const missingGoogleKey = provider === 'google' && hasGoogleKey === false
  const missingApifyToken = provider === 'apify' && hasApifyToken === false
  const keyBlocked = missingGoogleKey || missingApifyToken

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (keyBlocked) {
      setError(missingGoogleKey
        ? 'Add a Google Places API key in Settings before starting a Google scan.'
        : 'Add an Apify token in Settings before starting an Apify scan.')
      return
    }
    setBusy(true); setError(null)
    const res = await fetch('/api/scans', {
      method: 'POST',
      body: JSON.stringify({
        location, category, countryCode, provider,
        csvContent: csvContent || undefined,
        maxPlaces: provider === 'apify' ? maxPlaces : undefined,
      }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Failed to create scan'); return }
    writeLastScan({
      location, category, countryCode, provider,
      maxPlaces: provider === 'apify' ? maxPlaces : undefined,
    })
    router.push(`/app/scans/${data.id}`)
  }

  function applyLast() {
    const last = readLastScan()
    if (!last) return
    setLocation(last.location)
    setCategory(last.category)
    setCountryCode(last.countryCode)
    setProvider(last.provider)
    if (typeof last.maxPlaces === 'number') setMaxPlaces(last.maxPlaces)
    setLastScan(last)
  }

  const label = 'block font-mono text-[11px] uppercase tracking-[0.14em] text-mute'
  const input = 'mt-1.5 w-full rounded-md border border-line bg-base/60 px-3 py-2.5 text-sm text-text placeholder:text-mute'
  const providers: { value: typeof provider; label: string }[] = [
    { value: 'osm', label: 'OpenStreetMap' },
    { value: 'google', label: 'Google Places' },
    { value: 'csv', label: 'CSV import' },
    { value: 'apify', label: 'Apify Maps' },
  ]
  const examples: { label: string; location: string; category: string; countryCode: string }[] = [
    { label: 'Lahore 🇵🇰', location: 'Lahore, Pakistan', category: 'restaurant', countryCode: 'pk' },
    { label: 'Jaipur 🇮🇳', location: 'Jaipur, India', category: 'boutique', countryCode: 'in' },
    { label: 'Tallinn 🇪🇪', location: 'Tallinn, Estonia', category: 'cafe', countryCode: 'ee' },
    { label: 'Porto 🇵🇹', location: 'Porto, Portugal', category: 'dentist', countryCode: 'pt' },
    { label: 'Manchester 🇬🇧', location: 'Manchester, UK', category: 'plumber', countryCode: 'gb' },
    { label: 'Austin 🇺🇸', location: 'Austin, TX', category: 'bakery', countryCode: 'us' },
    { label: 'Perth 🇦🇺', location: 'Perth, Australia', category: 'electrician', countryCode: 'au' },
  ]

  function applyExample(ex: (typeof examples)[number]) {
    setLocation(ex.location)
    setCategory(ex.category)
    setCountryCode(ex.countryCode)
    setProvider('osm')
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-line bg-surface p-6">
      {lastScan && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyLast}
            className="rounded-md border border-lime/40 bg-lime/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-lime transition hover:bg-lime/20"
          >
            Reuse last — {lastScan.category} in {lastScan.location}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={label}>Location
          <input className={input} value={location} onChange={e => setLocation(e.target.value)} placeholder="Ottawa, ON" required />
        </label>
        <label className={label}>Category
          {provider === 'osm' ? (
            <select className={input} value={category} onChange={e => setCategory(e.target.value)} required>
              <option value="">Choose a category…</option>
              {SUPPORTED_OSM_CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          ) : (
            <input className={input} value={category} onChange={e => setCategory(e.target.value)} placeholder="bakery" required />
          )}
        </label>
        <label className={label}>Country code
          <input className={input} value={countryCode} onChange={e => setCountryCode(e.target.value)} maxLength={2} placeholder="us" required />
        </label>
      </div>
      <div>
        <span className={label}>Data source</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {providers.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setProvider(p.value)}
              aria-pressed={provider === p.value}
              className={`rounded-md px-4 py-2 text-sm transition ${
                provider === p.value ? 'bg-lime text-base' : 'border border-line text-dim'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2 rounded-md border border-line bg-base/40 p-3 text-xs text-dim">
          {provider === 'osm' && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">OpenStreetMap · free, no key</p>
              <p className="mt-1">Queries the public Overpass API for businesses in your area. Great coverage of independent local shops. The free server can get busy — if a scan pauses with a 504, just hit Resume. Pick a supported category from the dropdown.</p>
            </>
          )}
          {provider === 'google' && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Google Places · your API key</p>
              <p className="mt-1">Richer data (ratings, review counts). Set your key in Settings or the GOOGLE_PLACES_API_KEY environment variable — it stays on your server and uses your own free-tier quota.</p>
              {hasGoogleKey === false && (
                <p className="mt-2 text-amber-400">
                  {'⚠ No Google Places key saved. Add one in Settings, or set the GOOGLE_PLACES_API_KEY env var — otherwise the scan will fail. '}
                  <Link href="/app/settings" className="text-lime underline-offset-4 hover:underline">Open Settings</Link>
                </p>
              )}
            </>
          )}
          {provider === 'csv' && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">CSV import · your own list</p>
              <p className="mt-1">Paste rows with header name,address,phone,category,rating,review_count,website. PresenceZero probes each site, checks matching domains, and scores them — so you can run leads from any source.</p>
            </>
          )}
          {provider === 'apify' && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Apify Google Maps · your account</p>
              <p className="mt-1">Best coverage and the easiest setup — paste one token, no Google Cloud project. Uses your own Apify account; the free plan renews $5 of credit each month (about 1,250 places).</p>
              {hasApifyToken === false && (
                <p className="mt-2 text-amber-400">
                  {'⚠ No Apify token saved. Add one in Settings, or set the APIFY_TOKEN env var — otherwise the scan will fail. '}
                  <Link href="/app/settings" className="text-lime underline-offset-4 hover:underline">Open Settings</Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {provider === 'apify' && (
        <div>
          <label className={label} htmlFor="maxPlaces">
            Places to scan — {maxPlaces}
          </label>
          <input
            id="maxPlaces"
            type="range"
            min={1}
            max={100}
            step={1}
            value={maxPlaces}
            onChange={e => setMaxPlaces(Number(e.target.value))}
            className="mt-2 w-full accent-lime"
          />
          <p className="mt-1.5 text-xs text-dim">
            Estimated cost <span className="text-text">${(maxPlaces * 0.004).toFixed(2)}</span>
            {' '}· Apify charges $0.004 per place. The free $5/month covers about{' '}
            {Math.floor(5 / (maxPlaces * 0.004))} scans this size.
          </p>
        </div>
      )}
      <div>
        <span className={label}>{'// Try an example'}</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {examples.map(ex => (
            <button
              key={ex.label}
              type="button"
              onClick={() => applyExample(ex)}
              className="rounded-full border border-line px-3 py-1 text-xs text-dim transition hover:border-lime/40 hover:text-text"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
      {provider === 'csv' && (
        <label className={label}>CSV content (header: name,address,phone,category,rating,review_count,website)
          <textarea className={`${input} h-32 font-mono`} value={csvContent} onChange={e => setCsvContent(e.target.value)} required={provider === 'csv'} />
        </label>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" variant="primary" disabled={busy || keyBlocked} className="disabled:opacity-50">
        {busy ? 'Starting…' : keyBlocked ? 'Add API key to start' : 'Start scan'}
      </Button>
    </form>
  )
}
