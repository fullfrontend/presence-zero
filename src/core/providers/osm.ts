import { isFacebookUrl } from '../probes/facebook'
import type { RawBusiness } from '../types'
import { Provider, ProviderError } from './provider'
import { CATEGORY_TAGS, SUPPORTED_OSM_CATEGORIES, resolveOsmCategory } from './osm-categories'

const USER_AGENT = 'PresenceZero/0.1 (open-source lead finder)'

interface OverpassElement { type?: string; id?: number; tags?: Record<string, string> }

function toBusiness(el: OverpassElement): RawBusiness | null {
  const t = el.tags ?? {}
  if (!t.name) return null
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  const locality = [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ')
  const address = [street, locality].filter(Boolean).join(', ') || undefined
  const facebook = t['contact:facebook'] ?? t.facebook
  const facebookUrl = facebook && (isFacebookUrl(facebook) ? facebook
    : /^[a-zA-Z0-9._-]+$/.test(facebook) ? `https://www.facebook.com/${facebook}` : undefined)
  return {
    name: t.name,
    address,
    phone: t.phone ?? t['contact:phone'] ?? t['contact:mobile'],
    website: t.website?.trim() || t['contact:website']?.trim() || facebookUrl,
    facebookUrl: facebookUrl || undefined,
    sourceUrl: el.type && ['node', 'way', 'relation'].includes(el.type) && Number.isSafeInteger(el.id) && el.id! > 0
      ? `https://www.openstreetmap.org/${el.type}/${el.id}` : undefined,
    category: t.shop ?? t.amenity ?? t.craft,
  }
}

export function createOsmProvider(fetchFn: typeof fetch = fetch): Provider {
  return {
    id: 'osm',
    async fetchPage(area, _cursor, _config) {
      const key = resolveOsmCategory(area.category)
      const tag = key ? CATEGORY_TAGS[key] : undefined
      if (!tag) {
        throw new ProviderError(
          `OSM provider doesn't support "${area.category}" yet. Supported: ${SUPPORTED_OSM_CATEGORIES.join(', ')}.`,
        )
      }
      const geoRes = await fetchFn(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(area.location)}&format=json&limit=1`,
        { headers: { 'User-Agent': USER_AGENT } },
      )
      if (!geoRes.ok) throw new ProviderError(`Nominatim geocoding failed (HTTP ${geoRes.status}).`, true)
      const geo = (await geoRes.json()) as Array<{ boundingbox: [string, string, string, string] }>
      if (!geo.length) throw new ProviderError(`Could not find location "${area.location}" — try "City, Region".`)
      const [s, n, w, e] = geo[0].boundingbox
      const [k, v] = tag.split('=')
      const query = `[out:json][timeout:60];(nwr["${k}"="${v}"](${s},${w},${n},${e}););out center tags;`
      const opRes = await fetchFn('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!opRes.ok) throw new ProviderError(`Overpass query failed (HTTP ${opRes.status}) — the free server may be busy, retry shortly.`, true)
      const data = (await opRes.json()) as { elements: OverpassElement[] }
      const businesses = data.elements.map(toBusiness).filter((b): b is RawBusiness => b !== null)
      return { businesses, nextCursor: null }
    },
  }
}
