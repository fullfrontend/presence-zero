import { afterEach, expect, it, vi } from 'vitest'
import { createDb } from '@/db/client'
import { buildPipelineDeps } from '@/server/pipeline-deps'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('selects SearXNG when configured and never falls back to Brave on failure', async () => {
  vi.stubEnv('SEARXNG_URL', 'http://searxng:8080')
  vi.stubEnv('BRAVE_SEARCH_API_KEY', 'must-not-be-sent')
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }))
  vi.stubGlobal('fetch', fetchFn)
  const deps = buildPipelineDeps(createDb(':memory:'))
  const result = await deps.discoverWebsite!({ name: 'Chez Léon', address: 'Route de Philippeville 102, 6280 Gerpinnes' })
  expect(result.website).toBeNull()
  expect(fetchFn).toHaveBeenCalledTimes(1)
  expect(new URL(String(fetchFn.mock.calls[0][0])).hostname).toBe('searxng')
  expect(fetchFn.mock.calls[0][1]?.headers).toEqual({ Accept: 'application/json' })
})

it('leaves existing Brave selection available when SearXNG is not configured', () => {
  vi.stubEnv('SEARXNG_URL', '')
  expect(buildPipelineDeps(createDb(':memory:')).discoverWebsite).toBeUndefined()
})
