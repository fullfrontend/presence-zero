import { afterEach, expect, it, vi } from 'vitest'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb } from '@/db/client'
import { settings } from '@/db/schema'
import { loadRuntimeSettings, resolveSettings } from '@/server/runtime-settings'
import { loadPipelineDeps } from '@/server/pipeline-deps'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('resolves stored overrides, false and empty values before environment without mutating it', () => {
  const env = { AI_AUDIT_ENABLED: 'true', GOOGLE_PLACES_API_KEY: 'env-key', PRESENCEZERO_DEFAULT_LOCATION: 'Paris' }
  const resolved = resolveSettings([
    { key: 'config:AI_AUDIT_ENABLED', value: 'false' },
    { key: 'google_api_key', value: '' },
    { key: 'config:PRESENCEZERO_DEFAULT_LOCATION', value: '' },
    { key: 'config:DATABASE_URL', value: 'untrusted' },
  ], env)
  expect(resolved.env.AI_AUDIT_ENABLED).toBe('false')
  expect(resolved.env.GOOGLE_PLACES_API_KEY).toBe('')
  expect(resolved.env.DATABASE_URL).toBeUndefined()
  expect(resolved.configuration.PRESENCEZERO_DEFAULT_LOCATION).toEqual({ value: '', inherited: 'Paris', source: 'settings' })
  expect(resolved.configuration.BRAVE_SEARCH_ENABLED).toEqual({ value: 'false', inherited: 'false', source: 'default' })
  expect(env.GOOGLE_PLACES_API_KEY).toBe('env-key')
})

it('uses persisted switches and credentials on the next scan step without restarting', async () => {
  vi.stubEnv('AI_AUDIT_ENABLED', 'true')
  vi.stubEnv('SEARXNG_ENABLED', 'true')
  vi.stubEnv('SEARXNG_URL', 'http://unused:8080')
  vi.stubEnv('BRAVE_SEARCH_ENABLED', 'false')
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'environment-google')
  vi.stubEnv('OLLAMA_MODEL', 'environment-heavy')
  vi.stubEnv('AI_PROMPTS_DIR', '')
  vi.stubEnv('AI_PROMPT_PROFILE', 'default')
  const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ done: true, message: { content: JSON.stringify({
    summary: 'Local summary', brief: 'Check the listing', websiteQuality: null, findings: [],
  }) } }))
  vi.stubGlobal('fetch', fetchFn)
  const db = createDb(':memory:')
  await migrate(db, { migrationsFolder: 'drizzle' })
  await db.insert(settings).values([
    { key: 'config:AI_AUDIT_ENABLED', value: 'false' },
    { key: 'config:SEARXNG_ENABLED', value: 'false' },
    { key: 'config:BRAVE_SEARCH_ENABLED', value: 'true' },
    { key: 'google_api_key', value: 'settings-google' },
    { key: 'config:PRESENCEZERO_BATCH_SIZE', value: '3' },
  ])
  const disabled = await loadPipelineDeps(db)
  expect(disabled.auditLead).toBeUndefined()
  expect(disabled.discoverWebsite).toBeUndefined()
  expect(disabled.braveSearchEnabled).toBe(true)
  expect(disabled.batchSize).toBe(3)
  expect(await disabled.getSecret!('google_api_key')).toBe('settings-google')
  expect(fetchFn).not.toHaveBeenCalled()

  await db.delete(settings)
  await db.insert(settings).values([
    { key: 'config:AI_AUDIT_ENABLED', value: 'true' },
    { key: 'config:OLLAMA_LIGHT_MODEL', value: 'settings-light' },
    { key: 'config:OLLAMA_MODEL', value: 'settings-heavy' },
  ])
  vi.stubEnv('AI_AUDIT_ENABLED', 'false')
  const enabled = await loadPipelineDeps(db)
  await enabled.auditLead!({ name: 'Bakery', address: null, phone: null, category: null, rating: null,
    reviewCount: null, website: null, presence: 'none' })
  expect(fetchFn).toHaveBeenCalledTimes(1)
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body)).model).toBe('settings-light')
  expect((await loadRuntimeSettings(db)).env.OLLAMA_MODEL).toBe('settings-heavy')
  expect(await enabled.getSecret!('google_api_key')).toBe('environment-google')
})

it('uses customized SearXNG URL and persistent throttle spacing', async () => {
  vi.stubEnv('SEARXNG_ENABLED', 'false')
  vi.stubEnv('AI_AUDIT_ENABLED', 'false')
  const db = createDb(':memory:')
  await migrate(db, { migrationsFolder: 'drizzle' })
  await db.insert(settings).values([
    { key: 'config:SEARXNG_ENABLED', value: 'true' },
    { key: 'config:SEARXNG_URL', value: 'http://custom-search:8080' },
    { key: 'config:SEARXNG_MIN_INTERVAL_MS', value: '100' },
  ])
  const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ results: [] }))
  vi.stubGlobal('fetch', fetchFn)
  const deps = await loadPipelineDeps(db)
  await deps.discoverWebsite!({ name: 'Bakery', address: 'Main Street 1' })
  expect(String(fetchFn.mock.calls[0][0])).toContain('http://custom-search:8080/')
  expect(deps.braveSearchEnabled).toBe(false)
})
