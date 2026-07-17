'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/brand/button'

export default function SettingsForm() {
  const [hasKey, setHasKey] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [key, setKey] = useState('')
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void fetch('/api/settings').then(r => r.json()).then(d => {
      setHasKey(!!d.googleApiKey)
      setHasToken(!!d.apifyToken)
    })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, string> = {}
    if (key) payload.googleApiKey = key
    if (token) payload.apifyToken = token
    if (Object.keys(payload).length === 0) return
    const res = await fetch('/api/settings', { method: 'PUT', body: JSON.stringify(payload) })
    if (!res.ok) return
    setSaved(true)
    if (key) { setHasKey(true); setKey('') }
    if (token) { setHasToken(true); setToken('') }
  }

  const label = 'block font-mono text-sm'
  const input = 'mt-2 w-full rounded-md border border-line bg-base/60 px-3 py-2.5 text-sm text-text placeholder:text-mute'

  return (
    <form onSubmit={save} className="rounded-xl border border-line bg-surface p-6 space-y-6">
      <div>
        <label className={label}>
          Google Places API key
          {hasKey && <span className="ml-2 text-lime">(a key is saved)</span>}
        </label>
        <input type="password" className={input} value={key} placeholder="AIza…"
          onChange={e => { setKey(e.target.value); setSaved(false) }} />
        <p className="mt-2 text-mute text-xs">
          Stored in your own database and sent only to Google. If GOOGLE_PLACES_API_KEY is set in the environment, it takes precedence.
        </p>
      </div>
      <div>
        <label className={label}>
          Apify API token
          {hasToken && <span className="ml-2 text-lime">(a token is saved)</span>}
        </label>
        <input type="password" className={input} value={token} placeholder="apify_api_…"
          onChange={e => { setToken(e.target.value); setSaved(false) }} />
        <p className="mt-2 text-mute text-xs">
          Optional — only for the Apify data source. Stored in your own database and sent only to Apify. If APIFY_TOKEN is set in the environment, it takes precedence. Apify&rsquo;s free plan renews $5 of credit each month (~1,250 places); scans stop when it runs out.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={!key && !token}>Save</Button>
        {saved && <span className="text-lime text-sm">Saved.</span>}
      </div>
    </form>
  )
}
