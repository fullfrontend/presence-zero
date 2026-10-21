import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createWebsiteProbe } from '@/core/probes/website-probe'

const parkedHtml = readFileSync('fixtures/parked-page.html', 'utf8')
const respond = (body: string, status = 200) => (async () => new Response(body, { status })) as typeof fetch

// Default injected resolver for the behavior tests — always public, never touches the network.
const publicLookup = async () => ['93.184.216.34']

describe('website probe', () => {
  it('classifies a normal page as alive', async () => {
    const r = await createWebsiteProbe(respond('<html>Welcome to our bakery</html>'), { lookup: publicLookup })('example.com')
    expect(r.status).toBe('alive')
    expect(r.detail).toBe('Responded normally.')
  })
  it('classifies parked pages via patterns', async () => {
    const r = await createWebsiteProbe(respond(parkedHtml), { lookup: publicLookup })('example.com')
    expect(r.status).toBe('parked')
    expect(r.detail).toBe('Matched a registrar for-sale page.')
  })
  it('reports the real status code for a 5xx', async () => {
    const r = await createWebsiteProbe(respond('oops', 503), { lookup: publicLookup })('example.com')
    expect(r.status).toBe('dead')
    expect(r.detail).toBe('Returned HTTP 503.')
  })
  it('reports a DNS failure distinctly', async () => {
    const failingLookup = async () => { throw new Error('ENOTFOUND') }
    const r = await createWebsiteProbe(respond('x'), { lookup: failingLookup })('nope.example')
    expect(r.status).toBe('dead')
    expect(r.detail).toMatch(/DNS lookup failed/)
  })
  it('reports a blocked private address distinctly', async () => {
    const privateLookup = async () => ['127.0.0.1']
    const r = await createWebsiteProbe(respond('x'), { lookup: privateLookup })('localhost.example')
    expect(r.status).toBe('dead')
    expect(r.detail).toMatch(/private or internal/)
  })
  it('reports a non-http scheme distinctly', async () => {
    const r = await createWebsiteProbe(respond('x'), { lookup: publicLookup })('ftp://example.com')
    expect(r.status).toBe('dead')
    expect(r.detail).toBe('Not an http or https address.')
  })
  it('distinguishes a timeout from a plain connection failure', async () => {
    const hang = (async (_u: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_res, rej) => {
        init?.signal?.addEventListener('abort', () => rej(new Error('aborted')))
      })) as unknown as typeof fetch
    const timedOut = await createWebsiteProbe(hang, { lookup: publicLookup, timeoutMs: 10 })('example.com')
    expect(timedOut.status).toBe('dead')
    expect(timedOut.detail).toBe('Timed out after 0s.')

    const refused = (async () => { throw new TypeError('ECONNREFUSED') }) as unknown as typeof fetch
    const r = await createWebsiteProbe(refused, { lookup: publicLookup })('example.com')
    expect(r.detail).toBe('The connection failed.')
  })
  it('reports a redirect with no destination distinctly', async () => {
    const redir = (async () => new Response('', { status: 302 })) as unknown as typeof fetch
    const r = await createWebsiteProbe(redir, { lookup: publicLookup })('example.com')
    expect(r.status).toBe('dead')
    expect(r.detail).toBe('Redirected with no destination.')
  })
  it('reports a redirect loop distinctly', async () => {
    const loop = (async () => new Response('', { status: 302, headers: { location: 'https://example.com/next' } })) as unknown as typeof fetch
    const r = await createWebsiteProbe(loop, { lookup: publicLookup })('example.com')
    expect(r.status).toBe('dead')
    expect(r.detail).toBe('Redirect loop — more than 5 hops.')
  })

  it('prepends https:// to bare domains', async () => {
    let seen = ''
    const spy = (async (url: RequestInfo | URL) => { seen = String(url); return new Response('ok') }) as typeof fetch
    await createWebsiteProbe(spy, { lookup: publicLookup })('example.com')
    expect(seen).toBe('https://example.com')
  })
  it('reads at most ~100KB from the body and cancels the rest', async () => {
    let pulled = 0
    let cancelled = false
    const chunk = new TextEncoder().encode('x'.repeat(50_000))
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { pulled++; controller.enqueue(chunk) },
      cancel() { cancelled = true },
    })
    const fetchFn = (async () => new Response(stream, { status: 200 })) as typeof fetch
    const result = await createWebsiteProbe(fetchFn, { lookup: publicLookup })('example.com')
    expect(result.status).toBe('alive')
    expect(pulled).toBeLessThanOrEqual(3)
    expect(cancelled).toBe(true)
  })

  // --- SSRF hardening ---

  it('does not fetch a host that resolves to a private address', async () => {
    let called = false
    const spy = (async () => { called = true; return new Response('ok') }) as typeof fetch
    const result = await createWebsiteProbe(spy, { lookup: async () => ['10.0.0.1'] })('intranet.local')
    expect(result.status).toBe('dead')
    expect(called).toBe(false)
  })

  it('never fetches a non-http(s) scheme', async () => {
    let called = false
    const spy = (async () => { called = true; return new Response('ok') }) as typeof fetch
    const result = await createWebsiteProbe(spy, { lookup: publicLookup })('ftp://example.com')
    expect(result.status).toBe('dead')
    expect(called).toBe(false)
  })

  it('blocks a redirect that bounces to a private host', async () => {
    const lookup = async (host: string) => (host === 'public.example' ? ['93.184.216.34'] : ['169.254.169.254'])
    let calls = 0
    const fetchFn = (async () => {
      calls++
      return new Response(null, { status: 302, headers: { location: 'https://metadata.internal/' } })
    }) as typeof fetch
    const result = await createWebsiteProbe(fetchFn, { lookup })('public.example')
    expect(result.status).toBe('dead')
    expect(calls).toBe(1) // fetched the public hop once, blocked before fetching the private redirect target
  })

  it('follows a redirect to another public host and classifies it', async () => {
    const lookup = async () => ['93.184.216.34']
    let calls = 0
    const fetchFn = (async () => {
      calls++
      if (calls === 1) return new Response(null, { status: 301, headers: { location: 'https://www.example.com/' } })
      return new Response('<html>hello</html>', { status: 200 })
    }) as typeof fetch
    const result = await createWebsiteProbe(fetchFn, { lookup })('example.com')
    expect(result.status).toBe('alive')
    expect(calls).toBe(2)
  })

  it('gives up after too many redirects', async () => {
    const fetchFn = (async () => new Response(null, { status: 302, headers: { location: 'https://example.com/next' } })) as typeof fetch
    const result = await createWebsiteProbe(fetchFn, { lookup: publicLookup })('example.com')
    expect(result.status).toBe('dead')
  })
})

it.each(['DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'])('does not mistake a TLS certificate failure for a dead site: %s', async code => {
  const fetchFn = vi.fn<typeof fetch>(async () => { throw new TypeError('fetch failed', { cause: Object.assign(new Error('TLS'), { code }) }) })
  const result = await createWebsiteProbe({ lookup: publicLookup, fetchFn })('https://business.example')
  expect(result.status).toBe('probe_failed')
  expect(result.detail).toBe(`HTTPS certificate validation failed (${code}). Website availability could not be verified.`)
  expect(fetchFn).toHaveBeenCalledTimes(1) // Never disable certificate checks or silently downgrade to HTTP.
  expect(fetchFn.mock.calls[0][0]).toBe('https://business.example')
})
it('reports TLS protocol failures separately from certificate validation', async () => {
  const fetchFn = async () => { throw Object.assign(new Error('TLS'), { code: 'ERR_SSL_WRONG_VERSION_NUMBER' }) }
  const result = await createWebsiteProbe({ lookup: publicLookup, fetchFn })('https://business.example')
  expect(result.status).toBe('probe_failed')
  expect(result.detail).toContain('HTTPS negotiation failed')
})
it.each([404, 410])('does not classify HTTP %s error pages as live websites', async status => {
  const result = await createWebsiteProbe(respond('<title>Domain has been assigned</title>', status), { lookup: publicLookup })('example.com')
  expect(result).toEqual({ status: 'dead', detail: `Returned HTTP ${status}.` })
})
it.each([401, 403, 429])('leaves an HTTP %s blocked check unverified', async status => {
  const result = await createWebsiteProbe(respond('Blocked', status), { lookup: publicLookup })('example.com')
  expect(result).toEqual({ status: 'probe_failed', detail: `HTTP ${status} prevented website verification.` })
})
