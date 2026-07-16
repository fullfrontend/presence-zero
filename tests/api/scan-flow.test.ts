import { describe, it, expect, beforeAll, vi } from 'vitest'

process.env.DATABASE_URL = ':memory:'

const CSV = `name,phone,rating,review_count
Joe's Bakery,613-555-0101,4.6,80
Nameless Wonder Co,,,,
=SUM(A1),613-555-0199,4.0,10`

describe('scan API flow', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', (async (url: RequestInfo | URL) => {
      if (String(url).startsWith('https://rdap.org/')) return new Response('', { status: 404 })
      throw new Error(`unexpected fetch in test: ${url}`)
    }) as typeof fetch)
  })

  it('create → advance to done → results → patch → export', async () => {
    const scansRoute = await import('@/app/api/scans/route')
    const createRes = await scansRoute.POST(new Request('http://t/api/scans', {
      method: 'POST',
      body: JSON.stringify({ location: 'Ottawa, ON', category: 'bakery', countryCode: 'ca', provider: 'csv', csvContent: CSV }),
    }))
    expect(createRes.status).toBe(201)
    const { id } = await createRes.json()

    const advanceRoute = await import('@/app/api/scans/[id]/advance/route')
    let status = 'running'
    for (let i = 0; i < 20 && status === 'running'; i++) {
      const r = await advanceRoute.POST(new Request('http://t', { method: 'POST' }), { params: Promise.resolve({ id }) })
      status = (await r.json()).status
    }
    expect(status).toBe('done')

    const resultsRoute = await import('@/app/api/scans/[id]/results/route')
    const resultsRes = await resultsRoute.GET(new Request('http://t/api/x/results?minScore=50'), { params: Promise.resolve({ id }) })
    const { results } = await resultsRes.json()
    expect(results).toHaveLength(3)
    expect(results[0].name).toBe("Joe's Bakery")
    expect(results[0].presenceStatus).toBe('none')
    expect(results[0].domains.some((d: any) => d.available === true)).toBe(true)

    const bizRoute = await import('@/app/api/businesses/[id]/route')
    const patchRes = await bizRoute.PATCH(new Request('http://t', {
      method: 'PATCH', body: JSON.stringify({ leadStatus: 'contacted', note: 'left voicemail' }),
    }), { params: Promise.resolve({ id: results[0].id }) })
    expect((await patchRes.json()).leadStatus).toBe('contacted')

    const exportRoute = await import('@/app/api/scans/[id]/export/route')
    const csvRes = await exportRoute.GET(new Request('http://t'), { params: Promise.resolve({ id }) })
    expect(csvRes.headers.get('content-type')).toContain('text/csv')
    const csvText = await csvRes.text()
    expect(csvText).toContain("Joe's Bakery")
    // Formula-injection defense: a leading-= name is neutralized with a quote prefix.
    expect(csvText).toContain("'=SUM(A1)")
  }, 30_000) // RDAP checker throttles ~1s per domain; give the full flow room

  it('rejects invalid create payloads', async () => {
    const scansRoute = await import('@/app/api/scans/route')
    const res = await scansRoute.POST(new Request('http://t', { method: 'POST', body: JSON.stringify({ provider: 'csv' }) }))
    expect(res.status).toBe(400)
  })
})
