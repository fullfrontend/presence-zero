'use client'
import { useState } from 'react'
import { useI18n } from '@/i18n/client'
import { Button } from '@/components/brand/button'

export function WebsiteEditor({ businessId, website, onSaved }: { businessId: string; website?: string | null; onSaved: () => void }) {
  const { t } = useI18n()
  const [value, setValue] = useState(website ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/businesses/${businessId}/website`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ website: value }) })
      if (!response.ok) { setError(response.status === 400 ? 'Enter a valid independent website URL (HTTP or HTTPS).' : 'Could not save the website. Please try again.'); return }
      const result = await response.json()
      setValue(result.website)
      setMessage(result.paused ? 'Website saved. Resume the scan to check and audit it.' : result.aiEnabled
        ? 'Website saved. Verification and AI audit are queued.'
        : 'Website saved. Verification is queued; enable AI in Settings, then save again to run an AI audit.')
      onSaved()
    } catch { setError('Could not save the website. Please try again.') }
    finally { setBusy(false) }
  }
  return <form onSubmit={save} className="mt-4 border-t border-line pt-3">
    <label className="block text-xs text-mute">{t('Add or correct the website')}
      <input value={value} onChange={event => setValue(event.target.value)} placeholder="https://example.com" required maxLength={2048} disabled={busy}
        className="mt-2 w-full rounded border border-line bg-base px-3 py-2 text-sm text-text" />
    </label>
    <p className="mt-2 text-xs text-mute">{t('The previous audit is replaced. The new website is checked, then audited if AI is enabled.')}</p>
    <Button type="submit" variant="ghost" className="mt-2" disabled={busy || !value.trim()}>{t(busy ? 'Saving…' : 'Save and analyse')}</Button>
    {message && <p role="status" className="mt-2 text-xs text-lime">{t(message)}</p>}
    {error && <p role="alert" className="mt-2 text-xs text-amber-400">{t(error)}</p>}
  </form>
}
