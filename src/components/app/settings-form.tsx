'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/client'
import { Button } from '@/components/brand/button'
import { settingFields, type SettingKey, type SettingsConfiguration } from '@/config/settings'

type SecretKey = 'googleApiKey' | 'apifyToken' | 'braveSearchApiKey'
type Source = 'settings' | 'environment' | 'default'
type SettingsData = {
  configuration: SettingsConfiguration
  secrets: Record<SecretKey, { configured: boolean; source: Source }>
  aiAudit: { enabled: boolean; error?: string }
  searxngEnabled: boolean
  braveSearchEnabled: boolean
}
const secretFields: { key: SecretKey; label: string }[] = [
  { key: 'googleApiKey', label: 'Google Places API key' },
  { key: 'apifyToken', label: 'Apify API token' },
  { key: 'braveSearchApiKey', label: 'Brave Search API key' },
]

export default function SettingsForm() {
  const { t } = useI18n()
  const router = useRouter()
  const [data, setData] = useState<SettingsData | null>(null)
  const [patch, setPatch] = useState<Partial<Record<SettingKey, string | null>>>({})
  const [keys, setKeys] = useState<Partial<Record<SecretKey, string | null>>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalidFields, setInvalidFields] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const count = Object.keys(patch).length + Object.keys(keys).length

  async function readSettings(): Promise<SettingsData> {
    const response = await fetch('/api/settings', { cache: 'no-store' })
    if (!response.ok) throw new Error('load')
    return response.json()
  }
  useEffect(() => {
    let active = true
    void readSettings().then(value => { if (active) setData(value) }).catch(() => {
      if (active) setError('Could not load settings. Reload the page to try again.')
    })
    return () => { active = false }
  }, [])

  function change(key: SettingKey, value: string | null) {
    setPatch(previous => ({ ...previous, [key]: value }))
    setSaved(false)
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setInvalidFields([]); setSaved(false)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configuration: patch, ...keys }),
      })
      if (!response.ok) {
        const body = await response.json()
        setInvalidFields(body.fields ?? [])
        setError(body.error === 'Check the AI models, limits and private profile before enabling AI.'
          ? 'Check the AI models, limits and private profile before enabling AI.' : 'Some settings are invalid. Check the highlighted fields.')
        return
      }
      setPatch({}); setKeys({}); setSaved(true)
      try { setData(await readSettings()) } catch { setError('Settings saved, but the status could not be refreshed. Reload the page.') }
      router.refresh()
    } catch { setError('Could not save settings. Your changes are still here; try again.') }
    finally { setBusy(false) }
  }

  const input = 'w-full rounded-md border border-line bg-base px-3 py-2.5 text-sm text-text focus:border-lime focus:outline-none disabled:opacity-50'
  const sourceLabel = (source: Source) => source === 'settings' ? t('Customized') : source === 'environment' ? t('Environment (.env)') : t('Application default')
  const field = (definition: typeof settingFields[number]) => {
    const { key, label, kind } = definition
    const state = data?.configuration[key]
    const pending = patch[key]
    const inherited = pending === null || (pending === undefined && state?.source !== 'settings')
    const value = pending === null ? state?.inherited ?? definition.default : pending ?? state?.value ?? definition.default
    const invalid = invalidFields.includes(`configuration.${key}`)
    return <div key={key} className="grid gap-3 border-b border-line/60 py-5 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <label htmlFor={key} className="text-sm font-medium">{t(label)}</label>
        <p className="mt-1 text-xs text-mute">{pending !== undefined ? t('Pending change') : sourceLabel(state?.source ?? 'default')}</p>
        {invalid && <p id={`${key}-error`} className="mt-1 text-xs text-red-400">{t('Check this value.')}</p>}
      </div>
      <div className="space-y-2">
        <select className={input} aria-label={`${t(label)} · ${t('Value source')}`} value={inherited ? 'inherit' : 'custom'}
          onChange={e => change(key, e.target.value === 'inherit' ? null : value)}>
          <option value="inherit">{t('Use environment / default')}</option>
          <option value="custom">{t('Customize in Settings')}</option>
        </select>
        {kind === 'boolean' ? <select id={key} className={input} value={value} disabled={inherited} aria-invalid={invalid}
          onChange={e => change(key, e.target.value)}>
          <option value="true">{t('Enabled')}</option><option value="false">{t('Disabled')}</option>
        </select> : kind === 'locale' ? <select id={key} className={input} value={value} disabled={inherited} aria-invalid={invalid}
          onChange={e => change(key, e.target.value)}>
          <option value="fr-FR">Français (France)</option><option value="en-US">English (US)</option>
        </select> : <input id={key} className={input} type={kind === 'number' ? 'number' : 'text'} step="any" value={value}
          placeholder={key === 'PRESENCEZERO_BATCH_SIZE' ? t('Automatic (1 with AI, otherwise 8)') : undefined}
          disabled={inherited} aria-invalid={invalid} aria-describedby={invalid ? `${key}-error` : undefined}
          onChange={e => change(key, e.target.value)} />}
      </div>
    </div>
  }
  const group = (name: 'general' | 'search' | 'ai') => <>
    {settingFields.filter(item => item.group === name && !item.advanced).map(field)}
    <details className="mt-4 border-t border-line pt-4" open={invalidFields.some(key => settingFields.some(item => item.group === name && item.advanced && `configuration.${item.key}` === key)) || undefined}>
      <summary className="cursor-pointer text-sm text-dim transition-colors hover:text-lime">{t('Advanced settings')}</summary>
      <div className="mt-2">{settingFields.filter(item => item.group === name && item.advanced).map(field)}</div>
    </details>
  </>

  return <form onSubmit={save} className="space-y-8">
    <p className="max-w-2xl text-sm leading-relaxed text-dim">{t('Settings override .env. Choose environment / default to restore inheritance. Saved changes apply to the next scan step without restarting.')}</p>
    <nav aria-label={t('Settings sections')} className="flex flex-wrap gap-x-6 gap-y-3 border-b border-line pb-4 text-sm">
      <a className="hover:text-lime" href="#general">{t('General')}</a>
      <a className="hover:text-lime" href="#sources">{t('Data sources')}</a>
      <a className="hover:text-lime" href="#search">{t('Website discovery')}</a>
      <a className="hover:text-lime" href="#ai">{t('Local AI')}</a>
    </nav>
    {!data && !error && <p role="status" className="text-sm text-mute">{t('Loading settings…')}</p>}
    <fieldset disabled={!data || busy} className="min-w-0 space-y-12 disabled:opacity-70">
      <section id="general" className="scroll-mt-24">
        <h2 className="text-xl font-semibold">{t('General')}</h2>
        <p className="mt-2 text-sm text-mute">{t('Defaults for new scans. The language chosen in your browser stays preferred.')}</p>
        {group('general')}
      </section>
      <section id="sources" className="scroll-mt-24">
        <h2 className="text-xl font-semibold">{t('Data sources')}</h2>
        <p className="mt-2 text-sm text-mute">{t('OSM and CSV need no key. Saved keys override environment keys and are never displayed.')}</p>
        {secretFields.map(({ key, label }) => <div key={key} className="grid gap-3 border-b border-line py-5 md:grid-cols-2">
          <div><label htmlFor={key} className="text-sm font-medium">{t(label)}</label>
            <p className="mt-1 text-xs text-mute">{keys[key] !== undefined ? t('Pending change') : data?.secrets[key]?.configured ? `${t('Configured')} · ${sourceLabel(data.secrets[key].source)}` : t('Not configured')}</p>
          </div>
          <div className="space-y-2">
            <input id={key} className={input} type="password" autoComplete="new-password" value={keys[key] ?? ''}
              placeholder={t('Enter a new key to replace it')} onChange={e => { setKeys(previous => ({ ...previous, [key]: e.target.value })); setSaved(false) }} />
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <button type="button" className="text-dim underline hover:text-lime" onClick={() => { setKeys(previous => ({ ...previous, [key]: null })); setSaved(false) }}>{t('Use environment key')}</button>
              <button type="button" className="text-dim underline hover:text-lime" onClick={() => { setKeys(previous => ({ ...previous, [key]: '' })); setSaved(false) }}>{t('Disable this key')}</button>
            </div>
            {keys[key] === null && <p className="text-xs text-mute">{t('Will restore the environment key on save.')}</p>}
            {keys[key] === '' && <p className="text-xs text-mute">{t('Will disable this key, including its environment value.')}</p>}
          </div>
        </div>)}
      </section>
      <section id="search" className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold">{t('Website discovery')}</h2>
          <span className="text-xs text-lime">{data ? data.searxngEnabled ? t('SearXNG enabled') : data.braveSearchEnabled ? t('Brave Search enabled') : t('Search disabled') : '—'}</span></div>
        <p className="mt-2 text-sm text-mute">{t('Enable each engine explicitly. SearXNG has priority, with no automatic Brave fallback. Brave uses your own account and quota.')}</p>
        {group('search')}
      </section>
      <section id="ai" className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold">{t('Local AI')}</h2>
          <span className="text-xs text-lime">{data ? data.aiAudit.enabled ? t('Enabled') : t('Disabled') : '—'}</span></div>
        <p className="mt-2 text-sm text-mute">{t('One switch controls all AI: both models, evidence preparation, summaries and audits. Models must already be installed in Ollama.')}</p>
        {data?.aiAudit.error && <p className="mt-2 text-sm text-red-400">{t('Check the AI models, limits and private profile before enabling AI.')}</p>}
        {group('ai')}
      </section>
    </fieldset>
    <p className="text-xs leading-relaxed text-mute">{t('Database access, Docker ports, the Apify spending ceiling and the private profile directory remain deployment settings in .env. Existing scan reports are preserved.')}</p>
    <div className="sticky bottom-0 z-10 border-t border-line bg-base/95 py-4 backdrop-blur-sm">
      {error && <p role="alert" className="mb-3 text-sm text-red-400">{t(error)}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" className="disabled:cursor-not-allowed disabled:opacity-40" disabled={!data || busy || !count}>{busy ? t('Saving…') : t('Save changes')}</Button>
        {count > 0 && <button type="button" disabled={busy} className="text-sm text-dim underline" onClick={() => { setPatch({}); setKeys({}); setError(''); setInvalidFields([]) }}>{t('Discard changes')}</button>}
        <span role="status" className="text-xs text-mute">{saved ? t('Settings saved.') : count ? t('{0} pending changes', { 0: count }) : t('No pending changes')}</span>
      </div>
    </div>
  </form>
}
