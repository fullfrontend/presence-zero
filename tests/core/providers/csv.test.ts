import { describe, it, expect } from 'vitest'
import { csvProvider, parseCsv } from '@/core/providers/csv'
import { ProviderError } from '@/core/providers/provider'

const CSV = `name,address,phone,rating,review_count,website
"Joe's Bakery & Café","12 Main St, Ottawa",613-555-0101,4.6,80,
Plumb Perfect,,613-555-0102,3.9,12,http://plumbperfect.example.com
No Name Allowed Row,,,,,`

describe('parseCsv', () => {
  it('parses rows with quoted fields and missing values', () => {
    const rows = parseCsv(CSV)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({
      name: "Joe's Bakery & Café", address: '12 Main St, Ottawa', phone: '613-555-0101',
      category: undefined, rating: 4.6, reviewCount: 80, website: undefined,
    })
    expect(rows[1].website).toBe('http://plumbperfect.example.com')
  })
  it('throws ProviderError when name column is missing', () => {
    expect(() => parseCsv('address,phone\nx,y')).toThrow(ProviderError)
  })
  it('coerces non-numeric rating/review_count cells to undefined (not NaN)', () => {
    const rows = parseCsv('name,address,phone,rating,review_count,website\nBad Numbers Co,,,notanumber,alsobad,')
    expect(rows).toHaveLength(1)
    expect(rows[0].rating).toBeUndefined()
    expect(rows[0].reviewCount).toBeUndefined()
  })
})

describe('csvProvider', () => {
  it('returns all businesses in one page', async () => {
    const area = { location: 'x', category: 'y', countryCode: 'ca' }
    const res = await csvProvider.fetchPage(area, null, { csvContent: CSV })
    expect(res.businesses).toHaveLength(3)
    expect(res.nextCursor).toBeNull()
  })
  it('throws ProviderError without csvContent', async () => {
    const area = { location: 'x', category: 'y', countryCode: 'ca' }
    await expect(csvProvider.fetchPage(area, null, {})).rejects.toThrow(ProviderError)
  })
})
