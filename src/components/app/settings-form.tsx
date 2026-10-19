'use client'
import { useI18n } from '@/i18n/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/brand/button'

export default function SettingsForm() {
  const { t, system } = useI18n()
  const [aiAudit, setAiAudit] = useState<{ enabled: boolean; model?: string; lightModel?: string; profile?: string; language?: string; error?: string }>({ enabled: false })
  const [searxngEnabled, setSearxngEnabled] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [key, setKey] = useState('')
  const [token, setToken] = useState('')
  const [braveKey, setBraveKey] = useState('')
  const [hasBraveKey, setHasBraveKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void fetch('/api/settings').then(r => r.json()).then(d => {
      setAiAudit(d.aiAudit ?? { enabled: false })
      setSearxngEnabled(!!d.searxngEnabled)
      setHasKey(!!d.googleApiKey)
      setHasToken(!!d.apifyToken)
      setHasBraveKey(!!d.braveSearchApiKey)
    })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, string> = {}
    if (key) payload.googleApiKey = key
    if (token) payload.apifyToken = token
    if (braveKey) payload.braveSearchApiKey = braveKey
    if (Object.keys(payload).length === 0) return
    const res = await fetch('/api/settings', { method: 'PUT', body: JSON.stringify(payload) })
    if (!res.ok) return
    setSaved(true)
    if (braveKey) { setHasBraveKey(true); setBraveKey('') }
    if (key) { setHasKey(true); setKey('') }
    if (token) { setHasToken(true); setToken('') }
  }

  async function removeBraveKey() {
    const res = await fetch('/api/settings', { method: 'PUT', body: JSON.stringify({ braveSearchApiKey: '' }) })
    if (!res.ok) return
    const current = await fetch('/api/settings').then(r => r.json())
    setHasBraveKey(!!current.braveSearchApiKey)
    setBraveKey('')
  }

  const label = 'block font-mono text-sm'
  const input = 'mt-2 w-full rounded-md border border-line bg-base/60 px-3 py-2.5 text-sm text-text placeholder:text-mute'

  return (
    <form onSubmit={save} className="rounded-xl border border-line bg-surface p-6 space-y-6">
      <div>
        <label className={label}>
          {t("Google Places API key")}{hasKey && <span className="ml-2 text-lime">{t("(a key is saved)")}</span>}
        </label>
        <input type="password" className={input} value={key} placeholder={t("AIza…")}
          onChange={e => { setKey(e.target.value); setSaved(false) }} />
        <p className="mt-2 text-mute text-xs">
          {t("Stored in your own database and sent only to Google. If GOOGLE_PLACES_API_KEY is set in the environment, it takes precedence.")}</p>
      </div>
      <div>
        <label className={label}>
          {t("Apify API token")}{hasToken && <span className="ml-2 text-lime">{t("(a token is saved)")}</span>}
        </label>
        <input type="password" className={input} value={token} placeholder="apify_api_…"
          onChange={e => { setToken(e.target.value); setSaved(false) }} />
        <p className="mt-2 text-mute text-xs">
          {t("Optional — only for the Apify data source. Stored in your own database and sent only to Apify. If APIFY_TOKEN is set in the environment, it takes precedence. Apify’s free plan renews $5 of credit each month (~1,250 places); scans stop when it runs out.")}</p>
      </div>
      <div className="rounded-md border border-line p-4 text-sm">
        <p className="font-medium">{t("Local AI audit · ")}{aiAudit.enabled ? t("Configured") : t("Disabled")}</p>
        <p className="mt-2 text-xs text-mute">{aiAudit.error ? system(aiAudit.error) : (aiAudit.enabled
          ? t("Profile: {0}. Preparation / profiles: {1}. Website audits: {2} · {3}. New scans collect evidence and request an audit from your Ollama server. Availability is checked when a scan runs. Re-run completed scans to add audits.", { 0: aiAudit.profile, 1: aiAudit.lightModel, 2: aiAudit.model, 3: aiAudit.language })
          : t("Enable AI_AUDIT_ENABLED and select OLLAMA_MODEL in your environment. Ollama provides local website audits and lead summaries without a cloud API key."))}</p>
      </div>
      <div className="rounded-md border border-line p-4 text-sm">
        <p className="font-medium">{t("Website discovery · ")}{searxngEnabled ? t("SearXNG enabled") : t("SearXNG not configured")}</p>
        <p className="mt-2 text-xs text-mute">
          {searxngEnabled
            ? t("Uses your SearXNG instance without an API key. SearXNG takes priority over Brave, with no automatic paid fallback. Re-run completed scans to search for missing websites.")
            : t("For free self-hosted search, start the Docker setup and configure SEARXNG_URL. No search API key is needed.")}
        </p>
      </div>
      <div>
        <label className={label} htmlFor="brave-search-key">
          {t("Brave Search API key")}{hasBraveKey && <span className="ml-2 text-lime">{t("(a key is configured)")}</span>}
        </label>
        <input id="brave-search-key" type="password" className={input} value={braveKey}
          autoComplete="off" onChange={e => { setBraveKey(e.target.value); setSaved(false) }} />
        <p className="mt-2 text-mute text-xs">
          {t("Optional alternative when SearXNG is not configured — saving a key enables automatic website discovery for businesses without a listed website, across all sources. One search per business with an address, using its name and address. Matches require name and address evidence; uncertain results remain unverified. Existing completed scans must be rerun. BRAVE_SEARCH_API_KEY takes precedence.")}</p>
        {hasBraveKey && <button type="button" onClick={removeBraveKey} className="mt-2 text-xs text-lime underline">{t("Remove saved search key")}</button>}
        <p className="mt-2 text-mute text-xs">{t("To disable Brave discovery, remove the saved key and unset BRAVE_SEARCH_API_KEY if configured.")}</p>
        <p className="mt-2 text-mute text-xs">
          {t("Powered by ")}<a href="https://brave.com/search/api/" target="_blank" rel="noreferrer" className="text-lime underline">{t("Brave Search API")}</a>.
          {' '}{t("Uses your own account and quota. Set your spending limit in Brave to stay within your free credits.")}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={!key && !token && !braveKey}>{t("Save")}</Button>
        {saved && <span className="text-lime text-sm">{t("Saved.")}</span>}
      </div>
    </form>
  )
}
