import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createGooglePhoneLookup } from '@/core/enrich/google-phone'

const fixture = readFileSync('fixtures/google-phone.json', 'utf8')

describe('google phone lookup', () => {
  it('returns the phone number from the first matching place', async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(fixture, { status: 200 })) as unknown as typeof fetch
    const lookup = createGooglePhoneLookup('k', fetchFn)
    const phone = await lookup("Joe's Bakery", '12 Main St, Ottawa, ON')
    expect(phone).toBe('(613) 555-0101')

    const [url, init] = (fetchFn as any).mock.calls[0]
    expect(url).toBe('https://places.googleapis.com/v1/places:searchText')
    expect(new Headers(init?.headers).get('X-Goog-Api-Key')).toBe('k')
    expect(new Headers(init?.headers).get('X-Goog-FieldMask')).toBe('places.nationalPhoneNumber')
    const body = JSON.parse(init?.body as string)
    expect(body.textQuery).toBe("Joe's Bakery 12 Main St, Ottawa, ON")
    expect(body.pageSize).toBe(1)
  })

  it('trims a missing address out of the query', async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(fixture, { status: 200 })) as unknown as typeof fetch
    const lookup = createGooglePhoneLookup('k', fetchFn)
    await lookup('Joe', null)
    const init = (fetchFn as any).mock.calls[0][1]
    expect(JSON.parse(init?.body as string).textQuery).toBe('Joe')
  })

  it('returns null when no places are found', async () => {
    const fetchFn = (async () => new Response('{"places":[]}', { status: 200 })) as unknown as typeof fetch
    const lookup = createGooglePhoneLookup('k', fetchFn)
    expect(await lookup('Nothing Here', null)).toBeNull()
  })

  it('returns null when the fetch call throws', async () => {
    const fetchFn = (async () => { throw new Error('network down') }) as unknown as typeof fetch
    const lookup = createGooglePhoneLookup('k', fetchFn)
    expect(await lookup('Joe', 'addr')).toBeNull()
  })

  it('returns null on a non-ok response', async () => {
    const fetchFn = (async () => new Response('err', { status: 500 })) as unknown as typeof fetch
    const lookup = createGooglePhoneLookup('k', fetchFn)
    expect(await lookup('Joe', 'addr')).toBeNull()
  })

  it('returns null on malformed JSON', async () => {
    const fetchFn = (async () => new Response('not json', { status: 200 })) as unknown as typeof fetch
    const lookup = createGooglePhoneLookup('k', fetchFn)
    expect(await lookup('Joe', 'addr')).toBeNull()
  })
})
