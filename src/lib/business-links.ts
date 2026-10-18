import { isFacebookUrl } from '@/core/probes/facebook'

export interface BusinessLinksInput {
  listedWebsite?: string | null
  facebookUrl?: string | null
  sourceUrl?: string | null
}

/** Provider data must never create executable links in the browser. */
export function safeWebUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return null
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function businessLinks(row: BusinessLinksInput) {
  const listed = safeWebUrl(row.listedWebsite)
  const facebook = safeWebUrl(row.facebookUrl) ?? (isFacebookUrl(listed) ? listed : null)
  const source = safeWebUrl(row.sourceUrl)
  const host = source ? new URL(source).hostname : ''
  const sourceLabel = host === 'www.openstreetmap.org' || host === 'openstreetmap.org'
    ? 'OpenStreetMap' : 'Google Places'
  const trustedSource = /(^|\.)(google\.com|maps\.app\.goo\.gl|openstreetmap\.org)$/.test(host)
  return {
    website: listed && !isFacebookUrl(listed) ? listed : null,
    facebook: isFacebookUrl(facebook) ? facebook : null,
    source: trustedSource ? source : null,
    sourceLabel,
  }
}
