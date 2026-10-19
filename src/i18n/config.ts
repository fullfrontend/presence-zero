export const LOCALES = ['fr-FR', 'en-US'] as const
export type Locale = typeof LOCALES[number]
export const LOCALE_COOKIE = 'pz-locale'
export function normalizeLocale(value?: string | null): Locale | null {
  const normalized = value?.trim().toLowerCase()
  return normalized === 'fr-fr' ? 'fr-FR' : normalized === 'en-us' ? 'en-US' : null
}
export function resolveLocale(cookie?: string, acceptLanguage?: string, configuredDefault?: string): Locale {
  const selected = normalizeLocale(cookie)
  if (selected) return selected
  const preferred = (acceptLanguage ?? '').split(',').map((item, order) => {
    const [tag, ...parameters] = item.trim().split(';')
    const weight = parameters.find(p => p.trim().startsWith('q='))?.trim().slice(2)
    const quality = weight === undefined ? 1 : Number(weight)
    return { tag: tag.toLowerCase(), quality, order }
  }).filter(item => Number.isFinite(item.quality) && item.quality > 0 && item.quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.order - b.order)
  for (const { tag } of preferred) {
    if (tag === 'fr' || tag.startsWith('fr-')) return 'fr-FR'
    if (tag === 'en' || tag.startsWith('en-')) return 'en-US'
  }
  return normalizeLocale(configuredDefault) ?? 'en-US'
}
