import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createApifyProvider, buildApifyInput, DEFAULT_MAX_PLACES } from '@/core/providers/apify'
import { ProviderError } from '@/core/providers/provider'

const startJson = readFileSync('fixtures/apify-run-start.json', 'utf8')
const area = { location: 'Ottawa, ON', category: 'bakery', countryCode: 'ca' }
const noSleep = async () => {}

function jsonFetch(body: string, status = 200) {
  return vi.fn(async () => new Response(body, { status, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch
}

describe('buildApifyInput', () => {
  it('sends exactly the four allowlisted keys — every other field is billed', () => {
    const input = buildApifyInput(area, 50)
    expect(Object.keys(input).sort()).toEqual(
      ['language', 'locationQuery', 'maxCrawledPlacesPerSearch', 'searchStringsArray'],
    )
    expect(input.searchStringsArray).toEqual(['bakery'])
    expect(input.locationQuery).toBe('Ottawa, ON')
    expect(input.maxCrawledPlacesPerSearch).toBe(50)
  })
})

describe('apify provider — starting a run', () => {
  it('POSTs with a Bearer header and returns an empty page plus a run cursor', async () => {
    const fetchFn = jsonFetch(startJson)
    const res = await createApifyProvider({ fetchFn, sleep: noSleep })
      .fetchPage(area, null, { apifyToken: 'tok-1', maxPlaces: 25 })
    expect(res.businesses).toEqual([])
    expect(res.nextCursor).toBe('apify:RUN123:1')
    const [url, init] = (fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(url).toBe('https://api.apify.com/v2/acts/compass~crawler-google-places/runs')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1')
    expect(JSON.parse(init.body as string).maxCrawledPlacesPerSearch).toBe(25)
  })

  it('always sends maxCrawledPlacesPerSearch, defaulting when unset (empty = scrape everything)', async () => {
    const fetchFn = jsonFetch(startJson)
    await createApifyProvider({ fetchFn, sleep: noSleep }).fetchPage(area, null, { apifyToken: 't' })
    const body = JSON.parse((fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1].body as string)
    expect(body.maxCrawledPlacesPerSearch).toBe(DEFAULT_MAX_PLACES)
  })

  it('clamps maxPlaces to the 1..100 ceiling', async () => {
    for (const [given, expected] of [[9999, 100], [0, 1], [-5, 1]] as const) {
      const fetchFn = jsonFetch(startJson)
      await createApifyProvider({ fetchFn, sleep: noSleep })
        .fetchPage(area, null, { apifyToken: 't', maxPlaces: given })
      const body = JSON.parse((fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1].body as string)
      expect(body.maxCrawledPlacesPerSearch).toBe(expected)
    }
  })

  it('requires a token', async () => {
    const p = createApifyProvider({ fetchFn: jsonFetch('{}'), sleep: noSleep })
    await expect(p.fetchPage(area, null, {})).rejects.toThrow(/API token/)
  })
})

const runningJson = readFileSync('fixtures/apify-run-running.json', 'utf8')
const succeededJson = readFileSync('fixtures/apify-run-succeeded.json', 'utf8')
const itemsJson = readFileSync('fixtures/apify-dataset-items.json', 'utf8')

describe('apify provider — polling', () => {
  it('returns no businesses and bumps the poll count while RUNNING, throttling first', async () => {
    const fetchFn = jsonFetch(runningJson)
    const sleep = vi.fn(async () => {})
    const res = await createApifyProvider({ fetchFn, sleep })
      .fetchPage(area, 'apify:RUN123:1', { apifyToken: 't' })
    expect(res.businesses).toEqual([])
    expect(res.nextCursor).toBe('apify:RUN123:2')
    expect(sleep).toHaveBeenCalledTimes(1)
    const [url] = (fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(url).toBe('https://api.apify.com/v2/actor-runs/RUN123')
  })

  it('fetches dataset items on SUCCEEDED and ends the fetch phase', async () => {
    const fetchFn = vi.fn(async (url: RequestInfo | URL) =>
      new Response(String(url).includes('/datasets/') ? itemsJson : succeededJson, { status: 200 }),
    ) as unknown as typeof fetch
    const res = await createApifyProvider({ fetchFn, sleep: noSleep })
      .fetchPage(area, 'apify:RUN123:3', { apifyToken: 't' })
    expect(res.nextCursor).toBeNull()
    expect(res.businesses).toHaveLength(2)   // blank-title row dropped
    expect(res.businesses[0]).toMatchObject({
      name: "Joe's Bakery", address: '12 Main St, Ottawa, ON', phone: '(613) 555-0101',
      rating: 4.6, reviewCount: 80, category: 'Bakery',
    })
    expect(res.businesses[0].website).toBeUndefined()
    expect(res.businesses[0].closed).toBe(false)
  })

  it('composes an address from street/city when address is null, and flags closed places', async () => {
    const fetchFn = vi.fn(async (url: RequestInfo | URL) =>
      new Response(String(url).includes('/datasets/') ? itemsJson : succeededJson, { status: 200 }),
    ) as unknown as typeof fetch
    const res = await createApifyProvider({ fetchFn, sleep: noSleep })
      .fetchPage(area, 'apify:RUN123:3', { apifyToken: 't' })
    const loaf = res.businesses[1]
    expect(loaf).toMatchObject({ name: 'Crusty Loaf', address: '99 Elm St, Ottawa', phone: '+16135550102', closed: true })
    expect(loaf.rating).toBeUndefined()
    expect(loaf.reviewCount).toBeUndefined()
  })

  it('gives up with a recoverable error after the poll cap', async () => {
    const p = createApifyProvider({ fetchFn: jsonFetch(runningJson), sleep: noSleep })
    const err = await p.fetchPage(area, 'apify:RUN123:601', { apifyToken: 't' }).catch(e => e)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.recoverable).toBe(true)
    expect(err.message).toMatch(/still in progress/i)
  })
})

const unauthorizedJson = readFileSync('fixtures/apify-error-unauthorized.json', 'utf8')

describe('apify provider — errors', () => {
  const cases: [number, string, boolean, RegExp][] = [
    [401, unauthorizedJson, false, /rejected the API token/i],
    [429, '{}', true, /rate-limiting/i],
    [503, '{}', true, /retry shortly/i],
  ]
  it.each(cases)('maps HTTP %i to the right recoverable flag', async (status, body, recoverable, match) => {
    const p = createApifyProvider({ fetchFn: jsonFetch(body, status), sleep: noSleep })
    const err = await p.fetchPage(area, null, { apifyToken: 't' }).catch(e => e)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.recoverable).toBe(recoverable)
    expect(err.message).toMatch(match)
  })

  it('treats credit exhaustion as recoverable so the scan pauses rather than fails', async () => {
    const body = JSON.stringify({ error: { type: 'limit-reached', message: 'Monthly usage limit exceeded.' } })
    const p = createApifyProvider({ fetchFn: jsonFetch(body, 403), sleep: noSleep })
    const err = await p.fetchPage(area, null, { apifyToken: 't' }).catch(e => e)
    expect(err.recoverable).toBe(true)
    expect(err.message).toMatch(/credit exhausted/i)
  })

  it('never leaks the token into an error message', async () => {
    const body = JSON.stringify({ error: { type: 'bad-request', message: 'Bad token super-secret-token in request' } })
    const p = createApifyProvider({ fetchFn: jsonFetch(body, 400), sleep: noSleep })
    const err = await p.fetchPage(area, null, { apifyToken: 'super-secret-token' }).catch(e => e)
    expect(err.message).not.toContain('super-secret-token')
    expect(err.message).toContain('***')
  })

  it('maps a FAILED run to a non-recoverable error', async () => {
    const body = JSON.stringify({ data: { id: 'RUN123', status: 'FAILED' } })
    const p = createApifyProvider({ fetchFn: jsonFetch(body), sleep: noSleep })
    const err = await p.fetchPage(area, 'apify:RUN123:1', { apifyToken: 't' }).catch(e => e)
    expect(err.recoverable).toBe(false)
    expect(err.message).toMatch(/run failed/i)
  })
})
