import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createWebsiteProbe } from '@/core/probes/website-probe'

const parkedHtml = readFileSync('fixtures/parked-page.html', 'utf8')
const respond = (body: string, status = 200) => (async () => new Response(body, { status })) as typeof fetch

describe('website probe', () => {
  it('classifies a normal page as alive', async () => {
    expect(await createWebsiteProbe(respond('<html>Welcome to our bakery</html>'))('example.com')).toBe('alive')
  })
  it('classifies parked pages via patterns', async () => {
    expect(await createWebsiteProbe(respond(parkedHtml))('example.com')).toBe('parked')
  })
  it('classifies HTTP 500 as dead', async () => {
    expect(await createWebsiteProbe(respond('oops', 503))('example.com')).toBe('dead')
  })
  it('classifies network failure as dead', async () => {
    const failing = (async () => { throw new TypeError('getaddrinfo ENOTFOUND') }) as unknown as typeof fetch
    expect(await createWebsiteProbe(failing)('nope.example')).toBe('dead')
  })
  it('prepends https:// to bare domains', async () => {
    let seen = ''
    const spy = (async (url: RequestInfo | URL) => { seen = String(url); return new Response('ok') }) as typeof fetch
    await createWebsiteProbe(spy)('example.com')
    expect(seen).toBe('https://example.com')
  })
  it('reads at most ~100KB from the body and cancels the rest', async () => {
    let pulled = 0
    let cancelled = false
    const chunk = new TextEncoder().encode('x'.repeat(50_000)) // benign 50KB
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { pulled++; controller.enqueue(chunk) },
      cancel() { cancelled = true },
    })
    const fetchFn = (async () => new Response(stream, { status: 200 })) as typeof fetch
    const result = await createWebsiteProbe(fetchFn)('example.com')
    expect(result).toBe('alive')
    expect(pulled).toBeLessThanOrEqual(3) // ~100KB/50KB, not unbounded
    expect(cancelled).toBe(true)
  })
})
