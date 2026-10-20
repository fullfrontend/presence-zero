import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { createEvidenceCrawler } from '@/core/audit/crawl'
import { createPublicFetch, readLimited } from '@/core/audit/public-fetch'

const html = readFileSync('fixtures/audit-home.html', 'utf8')
const options = { maxPages: 2, timeoutMs: 1000, maxBytes: 200000, maxChars: 6000, delayMs: 100,
  now: () => 0, lookup: async () => ['93.184.216.34'], sleep: vi.fn(async () => {}) }
const htmlResponse = () => new Response(html, { headers: { 'Content-Type': 'text/html' } })

it('collects bounded same-origin evidence, hashes and dates while stripping active/hidden content', async () => {
  const fetchFn = vi.fn<typeof fetch>(async url => String(url).endsWith('/robots.txt') ? new Response('User-agent: *\nDisallow: /about') : htmlResponse())
  const pages = await createEvidenceCrawler({ ...options, fetchFn })('https://restaurant.example')
  expect(fetchFn.mock.calls.map(([url]) => String(url))).toEqual(['https://restaurant.example/robots.txt', 'https://restaurant.example/', 'https://restaurant.example/contact'])
  expect(pages).toHaveLength(2)
  expect(pages[0].text).toContain('Chez Léon')
  expect(pages[0].text).not.toMatch(/Ignore previous|SECRET_HIDDEN/)
  expect(pages[0].sha256).toMatch(/^[a-f0-9]{64}$/)
  expect(pages[0].retrievedAt).toBe('1970-01-01T00:00:00.000Z')
  expect(pages[0].facts).toContain('No meta description found in retrieved document')
  expect(options.sleep).toHaveBeenCalledWith(100)
})

it('respects robots disallow and fails closed on unavailable robots', async () => {
  for (const response of [new Response('User-agent: *\nDisallow: /'), new Response('', { status: 503 })]) {
    const fetchFn = vi.fn<typeof fetch>(async () => response)
    const pages = await createEvidenceCrawler({ ...options, fetchFn })('https://restaurant.example')
    expect(pages[0].error).toMatch(/robots/)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  }
})

it('does not call the network for private targets or credential-bearing URLs', async () => {
  const fetchFn = vi.fn<typeof fetch>()
  const crawl = createEvidenceCrawler({ ...options, fetchFn })
  expect((await crawl('http://127.0.0.1'))[0].error).toContain('blocked')
  await expect(crawl('https://user:pass@restaurant.example')).rejects.toThrow('unsafe_url')
  expect(fetchFn).not.toHaveBeenCalled()
})

it('validates every redirect and rejects private DNS answers, including mixed answers', async () => {
  const fetchFn = vi.fn<typeof fetch>(async () => new Response('', { status: 302, headers: { Location: 'http://169.254.169.254/latest' } }))
  const get = createPublicFetch({ fetchFn, lookup: options.lookup })
  await expect(get('https://restaurant.example', AbortSignal.timeout(1000))).rejects.toThrow('unsafe_address')
  expect(fetchFn).toHaveBeenCalledTimes(1)
  fetchFn.mockClear()
  await expect(createPublicFetch({ fetchFn, lookup: async () => ['93.184.216.34', '10.0.0.1'] })('https://restaurant.example', AbortSignal.timeout(1000))).rejects.toThrow('unsafe_address')
  expect(fetchFn).not.toHaveBeenCalled()
})

it('rejects foreign-origin page redirects before requesting the target', async () => {
  const fetchFn = vi.fn<typeof fetch>(async () => new Response('', { status: 302, headers: { Location: 'https://other.example' } }))
  await expect(createPublicFetch({ fetchFn, lookup: options.lookup })('https://restaurant.example/contact', AbortSignal.timeout(1000), 'https://restaurant.example')).rejects.toThrow('unsafe_url')
  expect(fetchFn).toHaveBeenCalledTimes(1)
})

it.each([['application/pdf', 200], ['text/html', 403]] as const)('does not use %s HTTP %s as evidence', async (type, status) => {
  const fetchFn = vi.fn<typeof fetch>(async url => String(url).endsWith('/robots.txt') ? new Response('', { status: 404 }) : new Response(html, { status, headers: { 'Content-Type': type } }))
  const pages = await createEvidenceCrawler({ ...options, fetchFn })('https://restaurant.example')
  expect(pages[0].error).not.toBeNull()
  expect(pages[0].sha256).toBeNull()
})

it('bounds response bytes, cancels the stream and marks truncation', async () => {
  const cancel = vi.fn()
  const response = new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('abcdefghij')) }, cancel }))
  expect(await readLimited(response, 4)).toEqual({ text: 'abcd', truncated: true })
  expect(cancel).toHaveBeenCalled()
})

it('checks robots again before following a redirect to a forbidden path', async () => {
  const fetchFn = vi.fn<typeof fetch>(async url => String(url).endsWith('/robots.txt')
    ? new Response('User-agent: *\nDisallow: /private')
    : new Response('', { status: 302, headers: { Location: '/private' } }))
  const pages = await createEvidenceCrawler({ ...options, fetchFn })('https://restaurant.example')
  expect(pages[0].error).toBe('fetch_failed_or_blocked')
  expect(fetchFn).toHaveBeenCalledTimes(2)
})

it('does not turn copyright dates into business age, but records explicit establishment claims', async () => {
  const fetchFn = vi.fn<typeof fetch>(async url => String(url).endsWith('/robots.txt') ? new Response('')
    : new Response(html.replace('</body>', '<p>Copyright 1999. Depuis 2012, nous cuisinons ici.</p></body>'), { headers: { 'Content-Type': 'text/html' } }))
  const [page] = await createEvidenceCrawler({ ...options, maxPages: 1, now: () => Date.UTC(2026, 9, 19), fetchFn })('https://restaurant.example')
  expect(page.facts).toContain('Claimed establishment year: 2012 (website claim, not independently verified)')
  expect(page.facts.join(' ')).not.toContain('1999')
})

it('records explicit freshness and functional signals without claiming a redesign date', async () => {
  const content = html.replace('</head>', '<meta property="article:modified_time" content="2026-10-01"></head>')
    .replace('</body>', '<object type="application/x-shockwave-flash"></object><a href="tel:+32123456789">Call</a><a href="mailto:test@example.test">Email</a></body>')
  const pages = await createEvidenceCrawler({ ...options, maxPages: 1, fetchFn: (async url => String(url).endsWith('/robots.txt')
    ? new Response('', { status: 404 }) : new Response(content, { headers: { 'Content-Type': 'text/html' } })) as typeof fetch })('https://restaurant.example')
  expect(pages[0].facts).toContain('Declared page article:modified_time: 2026-10-01 (not a website creation or redesign date)')
  expect(pages[0].facts).toContain('Flash embed declared in retrieved HTML (execution not tested)')
  expect(pages[0].facts).toContain('Telephone link present in retrieved HTML (interaction not tested)')
  expect(pages[0].facts).toContain('Email link present in retrieved HTML (interaction not tested)')
})
