import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createWebsiteProbe } from '@/core/probes/website-probe'

const parkedHtml = readFileSync('fixtures/parked-page.html', 'utf8')
const respond = (body: string, status = 200) => (async () => new Response(body, { status })) as typeof fetch

// Default injected resolver for the behavior tests — always public, never touches the network.
const publicLookup = async () => ['93.184.216.34']

describe('website probe', () => {
  it('classifies a normal page as alive', async () => {
    expect(await createWebsiteProbe(respond('<html>Welcome to our bakery</html>'), { lookup: publicLookup })('example.com')).toBe('alive')
  })
  it('classifies parked pages via patterns', async () => {
    expect(await createWebsiteProbe(respond(parkedHtml), { lookup: publicLookup })('example.com')).toBe('parked')
  })
  it('classifies HTTP 500 as dead', async () => {
    expect(await createWebsiteProbe(respond('oops', 503), { lookup: publicLookup })('example.com')).toBe('dead')
  })
  it('classifies network failure as dead', async () => {
    const failing = (async () => { throw new TypeError('boom') }) as unknown as typeof fetch
    expect(await createWebsiteProbe(failing, { lookup: publicLookup })('nope.example')).toBe('dead')
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
    expect(result).toBe('alive')
    expect(pulled).toBeLessThanOrEqual(3)
    expect(cancelled).toBe(true)
  })

  // --- SSRF hardening ---

  it('does not fetch a host that resolves to a private address', async () => {
    let called = false
    const spy = (async () => { called = true; return new Response('ok') }) as typeof fetch
    const result = await createWebsiteProbe(spy, { lookup: async () => ['10.0.0.1'] })('intranet.local')
    expect(result).toBe('dead')
    expect(called).toBe(false)
  })

  it('never fetches a non-http(s) scheme', async () => {
    let called = false
    const spy = (async () => { called = true; return new Response('ok') }) as typeof fetch
    const result = await createWebsiteProbe(spy, { lookup: publicLookup })('ftp://example.com')
    expect(result).toBe('dead')
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
    expect(result).toBe('dead')
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
    expect(result).toBe('alive')
    expect(calls).toBe(2)
  })

  it('gives up after too many redirects', async () => {
    const fetchFn = (async () => new Response(null, { status: 302, headers: { location: 'https://example.com/next' } })) as typeof fetch
    const result = await createWebsiteProbe(fetchFn, { lookup: publicLookup })('example.com')
    expect(result).toBe('dead')
  })
})
