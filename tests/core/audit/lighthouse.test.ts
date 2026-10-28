import { expect, it, vi } from 'vitest'
import { createLighthouseRunner } from '@/core/audit/lighthouse'
import fixture from '../../../fixtures/lighthouse-summary.json'
const lookup = async () => ['93.184.216.34']
it('preserves measured scores including zero, lab units and both device strategies', async () => {
  const fetchFn = vi.fn<typeof fetch>(async () => Response.json(fixture))
  const results = await createLighthouseRunner({ strategy: 'both', timeoutMs: 1000, apiKey: 'private-key', fetchFn, lookup, now: () => 0 })('https://business.example/')
  expect(results).toHaveLength(2)
  expect(results[0]).toMatchObject({ status: 'complete', strategy: 'mobile', scores: { performance: 63, bestPractices: 0, seo: 100 }, metrics: { lcpMs: 3200, cls: 0.08, tbtMs: 350 } })
  expect(results[1].strategy).toBe('desktop')
  const [url, init] = fetchFn.mock.calls[0]
  expect(new URL(String(url)).searchParams.getAll('category')).toEqual(['performance', 'accessibility', 'best-practices', 'seo'])
  expect(String(url)).not.toContain('private-key')
  expect(init?.headers).toEqual({ 'X-Goog-Api-Key': 'private-key' })
  expect(JSON.stringify(results)).not.toContain('private-key')
})
it('never interprets unavailable or malformed measurements as a zero score', async () => {
  for (const body of [{}, { lighthouseResult: { ...fixture.lighthouseResult, runtimeError: { code: 'FAILED_DOCUMENT_REQUEST' } } }, { lighthouseResult: { ...fixture.lighthouseResult, finalUrl: 'https://unrelated.example' } }]) {
    const result = await createLighthouseRunner({ strategy: 'mobile', timeoutMs: 1000, lookup, fetchFn: async () => Response.json(body) })('https://business.example/')
    expect(result[0].status).toBe('unavailable')
    expect(result[0].scores).toBeUndefined()
  }
})
it('stops after a quota response without trying the second device', async () => {
  const fetchFn = vi.fn<typeof fetch>(async () => new Response('', { status: 429 }))
  const results = await createLighthouseRunner({ strategy: 'both', timeoutMs: 1000, lookup, fetchFn })('https://business.example/')
  expect(results[0].reason).toBe('pagespeed_http_429')
  expect(fetchFn).toHaveBeenCalledTimes(1)
})
it.each(['http://127.0.0.1', 'http://169.254.169.254', 'file:///etc/passwd', 'https://user:password@business.example', 'https://business.example/?private=token'])('rejects unsafe or sensitive targets before sending them: %s', async url => {
  const fetchFn = vi.fn<typeof fetch>()
  const result = await createLighthouseRunner({ strategy: 'mobile', timeoutMs: 1000, lookup, fetchFn })(url)
  expect(result[0].reason).toBe('unsafe_target')
  expect(fetchFn).not.toHaveBeenCalled()
})
it('blocks hostnames resolving to private addresses', async () => {
  const fetchFn = vi.fn<typeof fetch>()
  await createLighthouseRunner({ strategy: 'mobile', timeoutMs: 1000, lookup: async () => ['10.0.0.1'], fetchFn })('https://internal.example')
  expect(fetchFn).not.toHaveBeenCalled()
})
