import { describe, expect, it, vi } from 'vitest'
import { createSearxngWebsiteSearch } from '@/core/enrich/website-search'
import fixture from '../../../fixtures/searxng-search.json'

const business = { name: 'Chez Léon', address: 'Route de Philippeville 102, 6280 Gerpinnes, Belgium' }
const fake = (body: unknown) => vi.fn<typeof fetch>().mockResolvedValue(Response.json(body))

describe('SearXNG website discovery', () => {
  it('uses the local JSON API without a key and verifies name/address evidence', async () => {
    const fetchFn = fake(fixture)
    const result = await createSearxngWebsiteSearch('http://searxng:8080/', fetchFn)(business)
    expect(result.website).toBe('https://chez-leon.example/contact')
    expect(result.detail).toContain('SearXNG')
    const [input, init] = fetchFn.mock.calls[0]
    const url = new URL(String(input))
    expect(url.origin + url.pathname).toBe('http://searxng:8080/search')
    expect(url.searchParams.get('format')).toBe('json')
    expect(url.searchParams.get('q')).toContain(business.address)
    expect(init?.headers).toEqual({ Accept: 'application/json' })
    expect(init?.redirect).toBe('error')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('preserves a service path prefix', async () => {
    const fetchFn = fake(fixture)
    await createSearxngWebsiteSearch('https://search.example/searx/', fetchFn)(business)
    expect(new URL(String(fetchFn.mock.calls[0][0])).pathname).toBe('/searx/search')
  })

  it('rejects ambiguous matching hosts', async () => {
    const hit = fixture.results[2]
    const fetchFn = fake({ results: [hit, { ...hit, url: 'https://chezleon.other/contact' }] })
    expect((await createSearxngWebsiteSearch('http://searxng:8080', fetchFn)(business)).website).toBeNull()
  })

  it('does not send a query without an address', async () => {
    const fetchFn = fake(fixture)
    await createSearxngWebsiteSearch('http://searxng:8080', fetchFn)({ ...business, address: null })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it.each([403, 429, 500])('keeps HTTP %s unverified without another request', async status => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status }))
    const result = await createSearxngWebsiteSearch('http://searxng:8080', fetchFn)(business)
    expect(result.website).toBeNull()
    expect(result.detail).toContain('unverified')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('reports unavailable upstream engines and handles bad responses', async () => {
    const fetchFn = fake({ results: [], unresponsive_engines: [['google', 'timeout']] })
    const result = await createSearxngWebsiteSearch('http://searxng:8080', fetchFn)(business)
    expect(result.website).toBeNull()
    expect(result.detail).toContain('engines were unavailable')
    for (const fetchFn of [fake({}), fake({ results: {} }), vi.fn<typeof fetch>().mockResolvedValue(new Response('bad json')), vi.fn<typeof fetch>().mockRejectedValue(new Error('timeout'))]) {
      expect((await createSearxngWebsiteSearch('http://searxng:8080', fetchFn)(business)).website).toBeNull()
    }
  })

  it('rejects non-HTTP or credential-bearing configuration', () => {
    expect(() => createSearxngWebsiteSearch('file:///etc/passwd')).toThrow()
    expect(() => createSearxngWebsiteSearch('http://user:password@example.com')).toThrow()
  })
})
