'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/brand/button'

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
    <form onSubmit={save} className="rounded-xl border border-line bg-surface p-6 space-y-4">
      <div>
        <label className="block font-mono text-sm">
          Google Places API key
          {hasKey && <span className="ml-2 text-lime">(a key is saved)</span>}
        </label>
        <input
          type="password"
          className="mt-2 w-full rounded-md border border-line bg-base/60 px-3 py-2.5 text-sm text-text placeholder:text-mute"
          value={key}
          onChange={e => { setKey(e.target.value); setSaved(false) }}
          placeholder="AIza…"
        />
      </div>
      <p className="text-mute text-xs">
        Stored in your own database and sent only to Google. If GOOGLE_PLACES_API_KEY is set in the environment, it takes precedence. Self-hosted and private.
      </p>
      <div className="flex items-center gap-3">
        <Button disabled={!key}>Save</Button>
        {saved && <span className="text-lime text-sm">Saved.</span>}
      </div>
    </form>
  )
}
