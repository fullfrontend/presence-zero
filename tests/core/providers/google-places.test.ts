import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createGooglePlacesProvider } from '@/core/providers/google-places'
import { ProviderError } from '@/core/providers/provider'

const fixture = readFileSync('fixtures/google-places.json', 'utf8')
const area = { location: 'Ottawa, ON', category: 'bakery', countryCode: 'ca' }

describe('google places provider', () => {
  it('maps places and passes cursor as pageToken', async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(fixture, { status: 200 })) as unknown as typeof fetch
    const res = await createGooglePlacesProvider(fetchFn).fetchPage(area, 'tok-1', { apiKey: 'k' })
    expect(res.businesses[0]).toMatchObject({
      name: "Joe's Bakery", phone: '(613) 555-0101', rating: 4.6, reviewCount: 80, category: 'Bakery',
    })
    expect(res.businesses[0].website).toBeUndefined()
    expect(res.businesses[0].sourceUrl).toBe('https://maps.google.com/?cid=123')
    expect((fetchFn as any).mock.calls[0][1].headers['X-Goog-FieldMask']).toContain('places.googleMapsUri')
    expect(res.nextCursor).toBe('page-2-token')
    const body = JSON.parse((fetchFn as any).mock.calls[0][1].body)
    expect(body.pageToken).toBe('tok-1')
    expect(body.textQuery).toBe('bakery in Ottawa, ON')
  })

  it('requires an API key', async () => {
    const p = createGooglePlacesProvider((async () => new Response('{}')) as typeof fetch)
    await expect(p.fetchPage(area, null, {})).rejects.toThrow(/API key/)
  })

  it('maps 429 to a recoverable quota error', async () => {
    const p = createGooglePlacesProvider((async () => new Response('{}', { status: 429 })) as typeof fetch)
    const err = await p.fetchPage(area, null, { apiKey: 'k' }).catch(e => e)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.recoverable).toBe(true)
  })

  it('maps 403 to a non-recoverable key error', async () => {
    const p = createGooglePlacesProvider((async () => new Response('{}', { status: 403 })) as typeof fetch)
    const err = await p.fetchPage(area, null, { apiKey: 'k' }).catch(e => e)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.recoverable).toBe(false)
  })

  it('maps a 500 to a recoverable ProviderError', async () => {
    const p = createGooglePlacesProvider((async () => new Response('err', { status: 500 })) as typeof fetch)
    const err = await p.fetchPage(area, null, { apiKey: 'k' }).catch(e => e)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.recoverable).toBe(true)
  })
})
