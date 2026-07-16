'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/brand/button'

export default function NewScanForm() {
  const router = useRouter()
  const [provider, setProvider] = useState<'google' | 'osm' | 'csv'>('osm')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [countryCode, setCountryCode] = useState('us')
  const [csvContent, setCsvContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const res = await fetch('/api/scans', {
      method: 'POST',
      body: JSON.stringify({ location, category, countryCode, provider, csvContent: csvContent || undefined }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Failed to create scan'); return }
    router.push(`/app/scans/${data.id}`)
  }

  const label = 'block font-mono text-[11px] uppercase tracking-[0.14em] text-mute'
  const input = 'mt-1.5 w-full rounded-md border border-line bg-base/60 px-3 py-2.5 text-sm text-text placeholder:text-mute'
  const providers: { value: typeof provider; label: string }[] = [
    { value: 'osm', label: 'OSM' },
    { value: 'google', label: 'Google' },
    { value: 'csv', label: 'CSV' },
  ]
  const examples: { label: string; location: string; category: string; countryCode: string }[] = [
    { label: 'Lahore 🇵🇰', location: 'Lahore, Pakistan', category: 'restaurants', countryCode: 'pk' },
    { label: 'Jaipur 🇮🇳', location: 'Jaipur, India', category: 'boutiques', countryCode: 'in' },
    { label: 'Tallinn 🇪🇪', location: 'Tallinn, Estonia', category: 'cafes', countryCode: 'ee' },
    { label: 'Porto 🇵🇹', location: 'Porto, Portugal', category: 'dentists', countryCode: 'pt' },
    { label: 'Manchester 🇬🇧', location: 'Manchester, UK', category: 'plumbers', countryCode: 'gb' },
    { label: 'Austin 🇺🇸', location: 'Austin, TX', category: 'bakeries', countryCode: 'us' },
    { label: 'Perth 🇦🇺', location: 'Perth, Australia', category: 'electricians', countryCode: 'au' },
  ]

  function applyExample(ex: (typeof examples)[number]) {
    setLocation(ex.location)
    setCategory(ex.category)
    setCountryCode(ex.countryCode)
    setProvider('osm')
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-line bg-surface p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={label}>Location
          <input className={input} value={location} onChange={e => setLocation(e.target.value)} placeholder="Ottawa, ON" required />
        </label>
        <label className={label}>Category
          <input className={input} value={category} onChange={e => setCategory(e.target.value)} placeholder="bakery" required />
        </label>
        <label className={label}>Country code
          <input className={input} value={countryCode} onChange={e => setCountryCode(e.target.value)} maxLength={2} placeholder="us" required />
        </label>
      </div>
      <div>
        <span className={label}>Data source</span>
        <div className="mt-1.5 flex gap-2">
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
      </div>
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
          <textarea className={`${input} h-32 font-mono`} value={csvContent} onChange={e => setCsvContent(e.target.value)} />
        </label>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" variant="primary" disabled={busy} className="disabled:opacity-50">
        {busy ? 'Starting…' : 'Start scan'}
      </Button>
    </form>
  )
}
