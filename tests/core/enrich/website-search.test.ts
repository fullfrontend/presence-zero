import { describe, expect, it, vi } from 'vitest'
import { createWebsiteSearch } from '@/core/enrich/website-search'
import fixture from '../../../fixtures/website-search.json'

const business = { name: 'Chez Léon', address: 'Route de Philippeville 102, 6280 Gerpinnes, Belgium' }
const fetchResult = (data: unknown) => vi.fn<typeof fetch>().mockResolvedValue(Response.json(data))

describe('website discovery', () => {
  it('matches name and address, rejecting a namesake and an unbranded directory', async () => {
    const fetchFn = fetchResult(fixture)
    const result = await createWebsiteSearch('secret', fetchFn)(business)
    expect(result.website).toBe('https://chez-leon.example/contact')
    expect(result.detail).toContain('Brave Search')
    const [url, init] = fetchFn.mock.calls[0]
    expect(new URL(String(url)).searchParams.get('q')).toContain(business.address)
    expect(init?.headers).toMatchObject({ 'X-Subscription-Token': 'secret' })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('keeps multiple matching domains ambiguous', async () => {
    const hit = fixture.web.results[2]
    const fetchFn = fetchResult({ web: { results: [hit, { ...hit, url: 'https://chezleon.other/contact' }] } })
    expect((await createWebsiteSearch('secret', fetchFn)(business)).website).toBeNull()
  })

  it('does not accept a city-only match or social profile', async () => {
    const fetchFn = fetchResult({ web: { results: [
      { ...fixture.web.results[2], description: '6280 Gerpinnes', extra_snippets: [] },
      { ...fixture.web.results[2], url: 'https://facebook.com/chezleon' },
    ] } })
    expect((await createWebsiteSearch('secret', fetchFn)(business)).website).toBeNull()
  })

  it('skips missing addresses without network access', async () => {
    const fetchFn = fetchResult(fixture)
    expect((await createWebsiteSearch('secret', fetchFn)({ ...business, address: null })).website).toBeNull()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it.each([401, 429, 500])('reports HTTP %s without asserting absence', async status => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status }))
    const result = await createWebsiteSearch('secret', fetchFn)(business)
    expect(result.website).toBeNull()
    expect(result.detail).toContain('unverified')
  })

  it('handles empty results, malformed JSON and network failures', async () => {
    for (const fetchFn of [fetchResult({}), vi.fn<typeof fetch>().mockResolvedValue(new Response('bad json')), vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))]) {
      expect((await createWebsiteSearch('secret', fetchFn)(business)).website).toBeNull()
    }
  })
})

it('distinguishes a completed empty search from missing or inconclusive search data', async () => {
  const search = (data: unknown) => createWebsiteSearch('secret', fetchResult(data))(business)
  expect((await search({ web: { results: [] } })).outcome).toBe('not_found')
  expect((await search({})).outcome).toBe('inconclusive')
  expect((await search({ web: { results: [fixture.web.results[0]] } })).outcome).toBe('not_found')
})

it('does not count search-only Facebook or directories as an independent website', async () => {
  const search = createWebsiteSearch('secret', fetchResult({ web: { results: [
    fixture.web.results[1],
    { ...fixture.web.results[2], url: 'https://www.facebook.com/chezleon' },
  ] } }))
  expect((await search(business)).outcome).toBe('not_found')
})
