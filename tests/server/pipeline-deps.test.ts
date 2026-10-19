import { migrate } from 'drizzle-orm/libsql/migrator'
import { afterEach, expect, it, vi } from 'vitest'
import { createDb } from '@/db/client'
import { buildPipelineDeps } from '@/server/pipeline-deps'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('selects SearXNG when configured and never falls back to Brave on failure', async () => {
  vi.stubEnv('SEARXNG_URL', 'http://searxng:8080')
  vi.stubEnv('SEARXNG_ENABLED', 'true')
  vi.stubEnv('BRAVE_SEARCH_ENABLED', 'true')
  vi.stubEnv('BRAVE_SEARCH_API_KEY', 'must-not-be-sent')
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 500 }))
  vi.stubGlobal('fetch', fetchFn)
  const db = createDb(':memory:')
  await migrate(db, { migrationsFolder: 'drizzle' })
  const deps = buildPipelineDeps(db)
  expect(deps.braveSearchEnabled).toBe(false)
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

it('wires configured Ollama summaries and defaults to one business per step', async () => {
  vi.stubEnv('AI_AUDIT_ENABLED', 'true')
  vi.stubEnv('OLLAMA_MODEL', 'local-test')
  vi.stubEnv('AI_AUDIT_LANGUAGE', 'nl')
  vi.stubEnv('PRESENCEZERO_BATCH_SIZE', '')
  const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ done: true, message: { content: JSON.stringify({
    summary: 'Profiel', brief: 'Controleer de website', websiteQuality: null, findings: [],
  }) } }))
  vi.stubGlobal('fetch', fetchFn)
  const deps = buildPipelineDeps(createDb(':memory:'))
  expect(deps.batchSize).toBe(1)
  const report = await deps.auditLead!({ name: 'Business', address: null, phone: null, category: null, rating: null,
    reviewCount: null, website: null, presence: 'none' })
  expect(report.status).toBe('complete')
  expect(report.language).toBe('nl')
  expect(report.opportunityScore).toBeNull()
  expect(String(fetchFn.mock.calls[0][0])).toBe('http://127.0.0.1:11434/api/chat')
})

it.each([undefined, 'false', '1', 'TRUE'])('does not enable configured searches with flag %s', flag => {
  vi.stubEnv('SEARXNG_ENABLED', flag)
  vi.stubEnv('BRAVE_SEARCH_ENABLED', flag)
  vi.stubEnv('SEARXNG_URL', 'http://searxng:8080')
  vi.stubEnv('BRAVE_SEARCH_API_KEY', 'configured-key')
  const deps = buildPipelineDeps(createDb(':memory:'))
  expect(deps.discoverWebsite).toBeUndefined()
  expect(deps.braveSearchEnabled).toBe(false)
})

it('allows Brave opt-in independently of a disabled SearXNG URL', () => {
  vi.stubEnv('SEARXNG_ENABLED', 'false')
  vi.stubEnv('SEARXNG_URL', 'http://searxng:8080')
  vi.stubEnv('BRAVE_SEARCH_ENABLED', 'true')
  const deps = buildPipelineDeps(createDb(':memory:'))
  expect(deps.discoverWebsite).toBeUndefined()
  expect(deps.braveSearchEnabled).toBe(true)
})
