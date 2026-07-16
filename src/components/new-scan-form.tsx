'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

  const input = 'w-full rounded border px-3 py-2 text-sm'
  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">Location
          <input className={input} value={location} onChange={e => setLocation(e.target.value)} placeholder="Ottawa, ON" required />
        </label>
        <label className="text-sm">Category
          <input className={input} value={category} onChange={e => setCategory(e.target.value)} placeholder="bakery" required />
        </label>
        <label className="text-sm">Country code
          <input className={input} value={countryCode} onChange={e => setCountryCode(e.target.value)} maxLength={2} placeholder="us" required />
        </label>
      </div>
      <label className="block text-sm">Data source
        <select className={input} value={provider} onChange={e => setProvider(e.target.value as typeof provider)}>
          <option value="osm">OpenStreetMap (free, no key)</option>
          <option value="google">Google Places (your API key — set it in Settings)</option>
          <option value="csv">CSV import</option>
        </select>
      </label>
      {provider === 'csv' && (
        <label className="block text-sm">CSV content (header: name,address,phone,category,rating,review_count,website)
          <textarea className={`${input} h-32 font-mono`} value={csvContent} onChange={e => setCsvContent(e.target.value)} />
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? 'Starting…' : 'Start scan'}
      </button>
    </form>
  )
}
