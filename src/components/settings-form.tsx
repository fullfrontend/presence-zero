'use client'
import { useEffect, useState } from 'react'

export default function SettingsForm() {
  const [hasKey, setHasKey] = useState(false)
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void fetch('/api/settings').then(r => r.json()).then(d => setHasKey(!!d.googleApiKey))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/settings', { method: 'PUT', body: JSON.stringify({ googleApiKey: key }) })
    if (res.ok) { setSaved(true); setHasKey(true); setKey('') }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded border bg-white p-4">
      <label className="block text-sm font-medium">
        Google Places API key {hasKey && <span className="font-normal text-emerald-700">(a key is saved)</span>}
        <input type="password" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={key}
          onChange={e => { setKey(e.target.value); setSaved(false) }} placeholder="AIza…" />
      </label>
      <p className="text-xs text-zinc-500">
        Stored locally in your own database and sent only to Google. The GOOGLE_PLACES_API_KEY
        environment variable takes precedence if set. Uses your own free-tier quota.
      </p>
      <button disabled={!key} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50">Save</button>
      {saved && <span className="ml-2 text-sm text-emerald-700">Saved.</span>}
    </form>
  )
}
