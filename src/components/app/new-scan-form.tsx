'use client'
import { useI18n } from '@/i18n/client'
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

export default function NewScanForm({ defaultLocation, defaultCountryCode, hasInitialGoogleKey }: {
  hasInitialGoogleKey: boolean
  defaultLocation: string
  defaultCountryCode: string
}) {
  const { t, number, system } = useI18n()
  const router = useRouter()
  const [provider, setProvider] = useState<'google' | 'osm' | 'csv' | 'apify'>(hasInitialGoogleKey ? 'google' : 'osm')
  const [location, setLocation] = useState(defaultLocation)
  const [category, setCategory] = useState('')
  const [countryCode, setCountryCode] = useState(defaultCountryCode)
  const [csvContent, setCsvContent] = useState('')
  const [maxPlaces, setMaxPlaces] = useState(50)
  const [hasApifyToken, setHasApifyToken] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hasGoogleKey, setHasGoogleKey] = useState<boolean | null>(hasInitialGoogleKey)
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
        ? t("Add a Google Places API key in Settings before starting a Google scan.")
        : t("Add an Apify token in Settings before starting an Apify scan."))
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
    if (!res.ok) { setError(data.error ?? t("Failed to create scan")); return }
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
    { value: 'osm', label: t("OpenStreetMap") },
    { value: 'google', label: t("Google Places") },
    { value: 'csv', label: t("CSV import") },
    { value: 'apify', label: t("Apify Maps") },
  ]
  const examples: { label: string; location: string; category: string; countryCode: string }[] = [
    { label: t("Lahore 🇵🇰"), location: "Lahore, Pakistan", category: "restaurant", countryCode: 'pk' },
    { label: t("Jaipur 🇮🇳"), location: "Jaipur, India", category: "boutique", countryCode: "in" },
    { label: t("Tallinn 🇪🇪"), location: "Tallinn, Estonia", category: "cafe", countryCode: 'ee' },
    { label: t("Porto 🇵🇹"), location: "Porto, Portugal", category: "dentist", countryCode: 'pt' },
    { label: t("Manchester 🇬🇧"), location: "Manchester, UK", category: "plumber", countryCode: 'gb' },
    { label: t("Austin 🇺🇸"), location: "Austin, TX", category: "bakery", countryCode: 'us' },
    { label: t("Perth 🇦🇺"), location: "Perth, Australia", category: "electrician", countryCode: 'au' },
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
            {t("Reuse last — ")}{lastScan.category} {t(" in ")}{lastScan.location}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={label}>{t("Location")}<input className={input} value={location} onChange={e => setLocation(e.target.value)} placeholder={t("Charleroi, Belgique")} required />
        </label>
        <label className={label}>{t("Category")}{provider === 'osm' ? (
            <select className={input} value={category} onChange={e => setCategory(e.target.value)} required>
              <option value="">{t("Choose a category…")}</option>
              {SUPPORTED_OSM_CATEGORIES.map(c => (
                <option key={c} value={c}>{t(c.replace(/_/g, ' '))}</option>
              ))}
            </select>
          ) : (
            <input className={input} value={category} onChange={e => setCategory(e.target.value)} placeholder={t("bakery")} required />
          )}
        </label>
        <label className={label}>{t("Country code")}<input className={input} value={countryCode} onChange={e => setCountryCode(e.target.value)} maxLength={2} placeholder="be" required />
        </label>
      </div>
      <div>
        <span className={label}>{t("Data source")}</span>
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
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{t("OpenStreetMap · free, no key")}</p>
              <p className="mt-1">{t("Queries the public Overpass API for businesses in your area. Great coverage of independent local shops. The free server can get busy — if a scan pauses with a 504, just hit Resume. Pick a supported category from the dropdown.")}</p>
            </>
          )}
          {provider === 'google' && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{t("Google Places · your API key")}</p>
              <p className="mt-1">{t("Richer data (ratings, review counts). Set your key in Settings or the GOOGLE_PLACES_API_KEY environment variable — it stays on your server and uses your own free-tier quota.")}</p>
              {hasGoogleKey === false && (
                <p className="mt-2 text-amber-400">
                  {t("⚠ No Google Places key saved. Add one in Settings, or set the GOOGLE_PLACES_API_KEY env var — otherwise the scan will fail. ")}
                  <Link href="/app/settings" className="text-lime underline-offset-4 hover:underline">{t("Open Settings")}</Link>
                </p>
              )}
            </>
          )}
          {provider === 'csv' && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{t("CSV import · your own list")}</p>
              <p className="mt-1">{t("Paste rows with header name,address,phone,category,rating,review_count,website. PresenceZero probes each site, checks matching domains, and scores them — so you can run leads from any source.")}</p>
            </>
          )}
          {provider === 'apify' && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{t("Apify Google Maps · your account")}</p>
              <p className="mt-1">{t("Best coverage and the easiest setup — paste one token, no Google Cloud project. Uses your own Apify account; the free plan renews $5 of credit each month (about 1,250 places).")}</p>
              {hasApifyToken === false && (
                <p className="mt-2 text-amber-400">
                  {t("⚠ No Apify token saved. Add one in Settings, or set the APIFY_TOKEN env var — otherwise the scan will fail. ")}
                  <Link href="/app/settings" className="text-lime underline-offset-4 hover:underline">{t("Open Settings")}</Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {provider === 'apify' && (
        <div>
          <label className={label} htmlFor="maxPlaces">
            {t("Places to scan — ")}{maxPlaces}
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
            {t("Estimated cost ")}<span className="text-text">{number(maxPlaces * 0.004, { style: 'currency', currency: 'USD' })}</span>
            {' '}{t("· Apify charges $0.004 per place. The free $5/month covers about")}{' '}
            {Math.floor(5 / (maxPlaces * 0.004))} {t(" scans this size.")}</p>
        </div>
      )}
      <div>
        <span className={label}>{t("// Try an example")}</span>
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
        <label className={label}>{t("CSV content (header: name,address,phone,category,rating,review_count,website)")}<textarea className={`${input} h-32 font-mono`} value={csvContent} onChange={e => setCsvContent(e.target.value)} required={provider === 'csv'} />
        </label>
      )}
      {error && <p className="text-sm text-red-400">{system(error)}</p>}
      <Button type="submit" variant="primary" disabled={busy || keyBlocked} className="disabled:opacity-50">
        {busy ? t("Starting…") : keyBlocked ? t("Add API key to start") : t("Start scan")}
      </Button>
    </form>
  )
}
