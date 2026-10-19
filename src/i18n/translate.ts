import messages from './fr-FR.json'
import type { Locale } from './config'
export type Translate = (message: string, values?: Record<string, string | number | null | undefined>) => string
const french: Record<string, string> = messages
export function createTranslator(locale: Locale): Translate {
  return (message, values) => {
    const key = message.replace(/\s+/g, ' ').trim()
    const translated = locale === 'fr-FR' && french[key] !== undefined
      ? (message.match(/^\s*/)?.[0] ?? '') + french[key] + (message.match(/\s*$/)?.[0] ?? '')
      : message
    return values ? translated.replace(/\{(\w+)\}/g, (match, key: string) => values[key] == null ? match : typeof values[key] === 'number' ? formatNumber(locale, values[key]) : String(values[key])) : translated
  }
}
export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value)
}
export function formatDate(locale: Locale, value: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(date)
}

// Translate only application-generated diagnostics. Never apply this to business names,
// operator notes, model prose, scraped evidence or URLs.
const patterns = Object.entries(french).filter(([key]) => /\{\d+\}/.test(key) && key.replace(/\{\d+\}/g, '').trim().length >= 5).map(([key]) => {
  const slots: string[] = []
  const escaped = key.split(/(\{\d+\})/).map(part => {
    if (/^\{\d+\}$/.test(part)) { slots.push(part.slice(1, -1)); return '(.*?)' }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }).join('')
  return { key, slots, regex: new RegExp(`^${escaped}$`) }
})
export function translateSystem(locale: Locale, message: string): string {
  const t = createTranslator(locale)
  if (locale === 'en-US' || french[message.replace(/\s+/g, ' ').trim()] !== undefined) return t(message)
  if (message.length > 10000) return message
  for (const { key, slots, regex } of patterns) {
    const match = regex.exec(message)
    if (match) return t(key, Object.fromEntries(slots.map((slot, i) => {
      const value = match[i + 1]
      const numericLabel = key === 'Rating {0}' || key === '{0} reviews'
      return [slot, numericLabel && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : value]
    })))
  }
  return message
}
