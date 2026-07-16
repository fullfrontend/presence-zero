import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createOsmProvider } from '@/core/providers/osm'
import { ProviderError } from '@/core/providers/provider'
import { resolveOsmCategory } from '@/core/providers/osm-categories'

const nominatim = readFileSync('fixtures/nominatim.json', 'utf8')
const overpass = readFileSync('fixtures/overpass.json', 'utf8')

function fakeFetch(): typeof fetch {
  return (async (url: RequestInfo | URL) => {
    const u = String(url)
    if (u.includes('nominatim')) return new Response(nominatim, { status: 200 })
    if (u.includes('overpass')) return new Response(overpass, { status: 200 })
    throw new Error(`unexpected url ${u}`)
  }) as typeof fetch
}

describe('osm provider', () => {
  const area = { location: 'Ottawa, ON', category: 'bakery', countryCode: 'ca' }

  it('geocodes then maps overpass elements, skipping unnamed', async () => {
    const res = await createOsmProvider(fakeFetch()).fetchPage(area, null, {})
    expect(res.businesses).toHaveLength(3)
    expect(res.businesses[0]).toMatchObject({ name: "Joe's Bakery", phone: '+1-613-555-0101', address: '12 Main St' })
    expect(res.businesses[1].website).toBe('https://crustyloaf.example.com')
    expect(res.nextCursor).toBeNull()
  })

  it('falls back to contact:mobile when no phone or contact:phone tag is present', async () => {
    const res = await createOsmProvider(fakeFetch()).fetchPage(area, null, {})
    const mobileOnly = res.businesses.find(b => b.name === 'Mobile Only Shop')
    expect(mobileOnly?.phone).toBe('+1-613-555-0199')
  })

  it('rejects unsupported categories with a helpful error', async () => {
    await expect(
      createOsmProvider(fakeFetch()).fetchPage({ ...area, category: 'submarine dealer' }, null, {}),
    ).rejects.toThrow(ProviderError)
  })

  it('surfaces geocode failure as ProviderError', async () => {
    const noResults = (async () => new Response('[]', { status: 200 })) as typeof fetch
    await expect(createOsmProvider(noResults).fetchPage(area, null, {})).rejects.toThrow(/location/i)
  })

  it('marks Overpass HTTP failure as a recoverable ProviderError', async () => {
    const failing = (async (url: RequestInfo | URL) => {
      const u = String(url)
      if (u.includes('nominatim')) return new Response(nominatim, { status: 200 })
      return new Response('busy', { status: 504 }) // overpass
    }) as typeof fetch
    const err = await createOsmProvider(failing).fetchPage(area, null, {}).catch(e => e)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.recoverable).toBe(true)
  })

  it('sends a User-Agent header on both requests', async () => {
    const seen: string[] = []
    const spy = (async (url: RequestInfo | URL, init?: RequestInit) => {
      const ua = new Headers(init?.headers).get('User-Agent')
      seen.push(ua ?? '')
      return new Response(String(url).includes('nominatim') ? nominatim : overpass, { status: 200 })
    }) as typeof fetch
    await createOsmProvider(spy).fetchPage(area, null, {})
    expect(seen).toHaveLength(2)
    expect(seen.every(ua => ua.length > 0)).toBe(true)
  })

  it('fetches successfully when the category is plural (e.g. example-chip categories)', async () => {
    const res = await createOsmProvider(fakeFetch()).fetchPage({ ...area, category: 'bakeries' }, null, {})
    expect(res.businesses).toHaveLength(3)
  })
})

describe('resolveOsmCategory', () => {
  it('resolves an exact singular key', () => {
    expect(resolveOsmCategory('bakery')).toBe('bakery')
  })

  it('resolves simple trailing-s plurals', () => {
    expect(resolveOsmCategory('dentists')).toBe('dentist')
    expect(resolveOsmCategory('restaurants')).toBe('restaurant')
  })

  it('resolves -ies plurals to -y singular', () => {
    expect(resolveOsmCategory('bakeries')).toBe('bakery')
  })

  it('resolves known synonyms', () => {
    expect(resolveOsmCategory('coffee')).toBe('cafe')
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(resolveOsmCategory('  Dentists  ')).toBe('dentist')
  })

  it('returns null for unknown categories', () => {
    expect(resolveOsmCategory('unicorns')).toBeNull()
  })
})
