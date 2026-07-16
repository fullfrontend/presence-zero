import type { RawBusiness } from '../types'
import { Provider, ProviderError } from './provider'

const USER_AGENT = 'PresenceZero/0.1 (open-source lead finder)'

export const CATEGORY_TAGS: Record<string, string> = {
  restaurant: 'amenity=restaurant', cafe: 'amenity=cafe', bar: 'amenity=bar',
  dentist: 'amenity=dentist', bakery: 'shop=bakery', hairdresser: 'shop=hairdresser',
  butcher: 'shop=butcher', florist: 'shop=florist', plumber: 'craft=plumber',
  electrician: 'craft=electrician', carpenter: 'craft=carpenter',
}

interface OverpassElement { tags?: Record<string, string> }

function toBusiness(el: OverpassElement): RawBusiness | null {
  const t = el.tags ?? {}
  if (!t.name) return null
  const address = [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ') || undefined
  return {
    name: t.name,
    address,
    phone: t.phone ?? t['contact:phone'] ?? t['contact:mobile'],
    website: t.website ?? t['contact:website'],
    category: t.shop ?? t.amenity ?? t.craft,
  }
}

export function createOsmProvider(fetchFn: typeof fetch = fetch): Provider {
  return {
    id: 'osm',
    async fetchPage(area, _cursor, _config) {
      const tag = CATEGORY_TAGS[area.category.toLowerCase().trim()]
      if (!tag) {
        throw new ProviderError(
          `OSM provider doesn't support "${area.category}" yet. Supported: ${Object.keys(CATEGORY_TAGS).join(', ')}.`,
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
