import { describe, it, expect } from 'vitest'
import { csvContentFor, maxPlacesFor, type PastScan } from '@/components/app/past-scans'

// maxPlacesFor decides how much money a re-run bills against the Apify $0.004/place
// cost — this must be right or a re-run silently falls back to the route's default
// and bills a different amount than the user originally chose.

function scan(overrides: Partial<PastScan> = {}): PastScan {
  return {
    id: 's1',
    createdAt: 0,
    location: 'Ottawa, ON',
    category: 'bakery',
    countryCode: 'ca',
    provider: 'apify',
    providerConfig: null,
    status: 'done',
    totalFound: 0,
    pinned: false,
    archived: false,
    label: null,
    title: null,
    leadCount: 0,
    ...overrides,
  }
}

describe('maxPlacesFor', () => {
  it('returns the stored maxPlaces for an Apify scan', () => {
    const s = scan({ providerConfig: JSON.stringify({ maxPlaces: 40 }) })
    expect(maxPlacesFor(s)).toBe(40)
  })

  it('returns undefined for a legacy Apify scan with no maxPlaces in providerConfig', () => {
    const s = scan({ providerConfig: JSON.stringify({ apifyToken: 'tok' }) })
    expect(maxPlacesFor(s)).toBeUndefined()
  })

  it('returns undefined when providerConfig is null', () => {
    const s = scan({ providerConfig: null })
    expect(maxPlacesFor(s)).toBeUndefined()
  })

  it('returns undefined for malformed providerConfig JSON without throwing', () => {
    const s = scan({ providerConfig: '{not json' })
    expect(() => maxPlacesFor(s)).not.toThrow()
    expect(maxPlacesFor(s)).toBeUndefined()
  })

  it('returns undefined for a non-apify provider even if maxPlaces is present', () => {
    const s = scan({ provider: 'google', providerConfig: JSON.stringify({ maxPlaces: 40 }) })
    expect(maxPlacesFor(s)).toBeUndefined()
  })

  it('returns undefined when maxPlaces is not a finite number', () => {
    const s = scan({ providerConfig: JSON.stringify({ maxPlaces: 'forty' }) })
    expect(maxPlacesFor(s)).toBeUndefined()
  })
})

describe('csvContentFor', () => {
  it('returns the stored csvContent for a csv scan', () => {
    const s = scan({ provider: 'csv', providerConfig: JSON.stringify({ csvContent: 'a,b\n1,2' }) })
    expect(csvContentFor(s)).toBe('a,b\n1,2')
  })

  it('returns undefined for a non-csv provider', () => {
    const s = scan({ provider: 'apify', providerConfig: JSON.stringify({ csvContent: 'a,b\n1,2' }) })
    expect(csvContentFor(s)).toBeUndefined()
  })

  it('returns undefined when csvContent is missing or empty', () => {
    expect(csvContentFor(scan({ provider: 'csv', providerConfig: JSON.stringify({}) }))).toBeUndefined()
    expect(csvContentFor(scan({ provider: 'csv', providerConfig: JSON.stringify({ csvContent: '' }) }))).toBeUndefined()
  })

  it('returns undefined for malformed providerConfig JSON without throwing', () => {
    const s = scan({ provider: 'csv', providerConfig: '{not json' })
    expect(() => csvContentFor(s)).not.toThrow()
    expect(csvContentFor(s)).toBeUndefined()
  })
})
