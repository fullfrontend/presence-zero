'use client'
import { useRouter } from 'next/navigation'
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config'
import { useI18n } from '@/i18n/client'
export function LanguageSelector() {
  const { locale, t } = useI18n()
  const router = useRouter()
  return <label className="inline-flex shrink-0 items-center gap-2 text-xs text-dim">
    <span className="sr-only">{t('Language')}</span>
    <select value={locale} aria-label={t('Language')} className="rounded border border-line bg-base px-2 py-1.5 text-text"
      onChange={event => {
        const selected = normalizeLocale(event.target.value)
        if (!selected) return
        document.cookie = `${LOCALE_COOKIE}=${selected}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
        router.refresh()
      }}>
      <option value="fr-FR" lang="fr-FR">Français</option>
      <option value="en-US" lang="en-US">English</option>
    </select>
  </label>
}
