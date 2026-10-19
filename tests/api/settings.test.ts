// Must be set before importing the db client so getDb()'s default never
// touches the real file DB (mirrors tests/db.test.ts).
process.env.DATABASE_URL = ':memory:'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import example from '../../examples/ai-prompts/default.json'
import { getDb } from '@/db/client'
import { settings } from '@/db/schema'

describe('settings API', () => {
  afterEach(() => vi.unstubAllEnvs())
  // Each test starts from an empty settings table so assertions never depend
  // on execution order — the two secret keys are fixed strings, not per-test UUIDs.
  beforeEach(async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '')
    const db = await getDb()
    await db.delete(settings)
  })

  it('GET returns null for both secrets when nothing is stored', async () => {
    const route = await import('@/app/api/settings/route')
    const res = await route.GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ aiAudit: { enabled: false }, searxngEnabled: false, braveSearchEnabled: false, googleApiKey: null, apifyToken: null, braveSearchApiKey: null })
  })

  it('GET masks a stored secret and never leaks the raw value in the response body', async () => {
    const SENTINEL = 'super-secret-sentinel'
    const db = await getDb()
    await db.insert(settings).values({ key: 'google_api_key', value: SENTINEL })

    const route = await import('@/app/api/settings/route')
    const res = await route.GET()
    const raw = await res.text()

    // The critical regression guard: whatever shape the handler serialises,
    // the stored secret value itself must never appear in the wire response.
    expect(raw).not.toContain(SENTINEL)

    const body = JSON.parse(raw)
    expect(body).toMatchObject({ aiAudit: { enabled: false }, searxngEnabled: false, braveSearchEnabled: false, googleApiKey: '***', apifyToken: null, braveSearchApiKey: null })
  })

  it('PUT with only googleApiKey stores it (backward-compat shape from the settings form)', async () => {
    const route = await import('@/app/api/settings/route')
    const putRes = await route.PUT(new Request('http://t', {
      method: 'PUT',
      body: JSON.stringify({ googleApiKey: 'g-key-1' }),
    }))
    expect(putRes.status).toBe(200)
    expect(await putRes.json()).toEqual({ ok: true })

    const getRes = await route.GET()
    expect(await getRes.json()).toMatchObject({ aiAudit: { enabled: false }, searxngEnabled: false, braveSearchEnabled: false, googleApiKey: '***', apifyToken: null, braveSearchApiKey: null })
  })

  it('PUT with only apifyToken stores it', async () => {
    const route = await import('@/app/api/settings/route')
    const putRes = await route.PUT(new Request('http://t', {
      method: 'PUT',
      body: JSON.stringify({ apifyToken: 'a-token-1' }),
    }))
    expect(putRes.status).toBe(200)
    expect(await putRes.json()).toEqual({ ok: true })

    const getRes = await route.GET()
    expect(await getRes.json()).toMatchObject({ aiAudit: { enabled: false }, searxngEnabled: false, braveSearchEnabled: false, googleApiKey: null, apifyToken: '***', braveSearchApiKey: null })
  })

  it('PUT with both stores each value under the exact settings table keys the pipeline reads', async () => {
    const route = await import('@/app/api/settings/route')
    const putRes = await route.PUT(new Request('http://t', {
      method: 'PUT',
      body: JSON.stringify({ googleApiKey: 'g-key-2', apifyToken: 'a-token-2' }),
    }))
    expect(putRes.status).toBe(200)

    const db = await getDb()
    const rows = await db.select().from(settings)
    const byKey = Object.fromEntries(rows.map(r => [r.key, r.value]))

    // Exact literal keys — getSecret() in the pipeline reads these strings verbatim,
    // so a typo here would silently break credential resolution.
    expect(byKey['google_api_key']).toBe('g-key-2')
    expect(byKey['apify_token']).toBe('a-token-2')
    expect(rows).toHaveLength(2)
  })

  it('PUT with {} is rejected with 400', async () => {
    const route = await import('@/app/api/settings/route')
    const res = await route.PUT(new Request('http://t', {
      method: 'PUT',
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })

  it('PUT upserts: writing the same key twice updates the row instead of duplicating or throwing', async () => {
    const route = await import('@/app/api/settings/route')
    await route.PUT(new Request('http://t', {
      method: 'PUT',
      body: JSON.stringify({ googleApiKey: 'first-value' }),
    }))
    const secondRes = await route.PUT(new Request('http://t', {
      method: 'PUT',
      body: JSON.stringify({ googleApiKey: 'second-value' }),
    }))
    expect(secondRes.status).toBe(200)

    const db = await getDb()
    const rows = await db.select().from(settings).where(eq(settings.key, 'google_api_key'))
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe('second-value')
  })
  it('stores, masks and removes the optional search key', async () => {
    const route = await import('@/app/api/settings/route')
    const save = await route.PUT(new Request('http://t', {
      method: 'PUT', body: JSON.stringify({ braveSearchApiKey: 'search-secret' }),
    }))
    expect(save.status).toBe(200)
    const raw = await (await route.GET()).text()
    expect(raw).not.toContain('search-secret')
    expect(JSON.parse(raw).braveSearchApiKey).toBe('***')
    const db = await getDb()
    expect((await db.select().from(settings).where(eq(settings.key, 'brave_search_api_key')))[0].value).toBe('search-secret')
    await route.PUT(new Request('http://t', {
      method: 'PUT', body: JSON.stringify({ braveSearchApiKey: '' }),
    }))
    expect((await (await route.GET()).json()).braveSearchApiKey).toBeNull()
  })

  it('recognizes an environment Google key without exposing it', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'environment-secret')
    const route = await import('@/app/api/settings/route')
    const raw = await (await route.GET()).text()
    expect(JSON.parse(raw).googleApiKey).toBe('***')
    expect(raw).not.toContain('environment-secret')
  })

  it('ignores empty Google credentials', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '   ')
    const db = await getDb()
    await db.insert(settings).values({ key: 'google_api_key', value: '   ' })
    const route = await import('@/app/api/settings/route')
    expect((await (await route.GET()).json()).googleApiKey).toBeNull()
  })

  it('exposes model roles and profile ID without exposing private prompt contents or paths', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'pz-settings-profile-'))
    try {
      writeFileSync(path.join(directory, 'default.json'), JSON.stringify({ ...example,
        context: { ...example.context, businessName: 'PRIVATE-CONTEXT-SENTINEL' } }))
      vi.stubEnv('AI_AUDIT_ENABLED', 'true')
      vi.stubEnv('OLLAMA_MODEL', 'heavy-local')
      vi.stubEnv('OLLAMA_LIGHT_MODEL', 'light-local')
      vi.stubEnv('AI_PROMPTS_DIR', directory)
      vi.stubEnv('AI_PROMPT_PROFILE', 'default')
      const route = await import('@/app/api/settings/route')
      const raw = await (await route.GET()).text()
      expect(JSON.parse(raw).aiAudit).toEqual({ enabled: true, model: 'heavy-local', lightModel: 'light-local', profile: 'default', language: 'fr' })
      expect(raw).not.toContain('PRIVATE-CONTEXT-SENTINEL')
      expect(raw).not.toContain(directory)
      expect(raw).not.toContain(example.prompts.websiteAudit)
    } finally { rmSync(directory, { recursive: true, force: true }) }
  })

})


it.each(['env', 'db'])('reports search readiness only after opt-in with %s credentials', async source => {
  const db = await getDb()
  await db.delete(settings)
  vi.stubEnv('BRAVE_SEARCH_API_KEY', source === 'env' ? 'test-key' : '')
  vi.stubEnv('SEARXNG_URL', 'http://searxng:8080')
  if (source === 'db') await db.insert(settings).values({ key: 'brave_search_api_key', value: 'test-key' })
  const route = await import('@/app/api/settings/route')
  try {
    for (const flag of [undefined, 'true', 'false']) {
      vi.stubEnv('SEARXNG_ENABLED', flag)
      vi.stubEnv('BRAVE_SEARCH_ENABLED', flag)
      const body = await (await route.GET()).json()
      expect(body.searxngEnabled).toBe(flag === 'true')
      expect(body.braveSearchEnabled).toBe(flag === 'true')
      expect(body.braveSearchApiKey).toBe('***')
    }
  } finally { vi.unstubAllEnvs() }
})

describe('settings overrides', () => {
  beforeEach(async () => {
    await (await getDb()).delete(settings)
    vi.stubEnv('AI_AUDIT_ENABLED', 'false')
    vi.stubEnv('AI_PROMPTS_DIR', '')
    vi.stubEnv('AI_PROMPT_PROFILE', 'default')
  })
  afterEach(() => vi.unstubAllEnvs())
  async function put(body: unknown) {
    const route = await import('@/app/api/settings/route')
    return route.PUT(new Request('http://t', { method: 'PUT', body: JSON.stringify(body) }))
  }
  async function read() { return (await (await import('@/app/api/settings/route')).GET()).json() }

  it('overrides environment flags and restores inheritance with null', async () => {
    vi.stubEnv('SEARXNG_ENABLED', 'true')
    vi.stubEnv('SEARXNG_URL', 'http://search:8080')
    expect((await put({ configuration: { SEARXNG_ENABLED: 'false', PRESENCEZERO_DEFAULT_LOCATION: 'Namur' } })).status).toBe(200)
    expect((await read()).searxngEnabled).toBe(false)
    expect((await read()).configuration.SEARXNG_ENABLED).toEqual({ value: 'false', inherited: 'true', source: 'settings' })
    expect((await put({ configuration: { SEARXNG_ENABLED: null } })).status).toBe(200)
    expect((await read()).searxngEnabled).toBe(true)
    expect((await read()).configuration.PRESENCEZERO_DEFAULT_LOCATION.value).toBe('Namur')
  })

  it('can enable AI over false environment and disable it over true environment', async () => {
    expect((await put({ configuration: { AI_AUDIT_ENABLED: 'true', OLLAMA_MODEL: 'custom-heavy', OLLAMA_LIGHT_MODEL: 'custom-light' } })).status).toBe(200)
    expect((await read()).aiAudit).toMatchObject({ enabled: true, model: 'custom-heavy', lightModel: 'custom-light' })
    vi.stubEnv('AI_AUDIT_ENABLED', 'true')
    expect((await put({ configuration: { AI_AUDIT_ENABLED: 'false' } })).status).toBe(200)
    expect((await read()).aiAudit.enabled).toBe(false)
  })

  it('masks overridden keys, allows explicit disabling and restores the environment key', async () => {
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'ENV-SECRET-SENTINEL')
    await put({ braveSearchApiKey: 'SAVED-SECRET-SENTINEL' })
    let body = await read()
    expect(body.secrets.braveSearchApiKey).toEqual({ configured: true, source: 'settings' })
    expect(JSON.stringify(body)).not.toContain('SECRET-SENTINEL')
    await put({ braveSearchApiKey: '' })
    expect((await read()).braveSearchApiKey).toBeNull()
    await put({ braveSearchApiKey: null })
    body = await read()
    expect(body.secrets.braveSearchApiKey).toEqual({ configured: true, source: 'environment' })
    expect(JSON.stringify(body)).not.toContain('SECRET-SENTINEL')
  })

  it.each([
    { DATABASE_URL: 'file:elsewhere.db' }, { AI_PROMPTS_DIR: '/tmp/private' },
    { SEARXNG_ENABLED: 'yes' }, { SEARXNG_URL: 'file:///etc/passwd' },
    { SEARXNG_URL: 'http://user:password@localhost:8080' }, { SEARXNG_MIN_INTERVAL_MS: '-1' },
    { OLLAMA_MODEL: 'model:cloud' }, { AI_AUDIT_MAX_PAGES: '99' },
    { PRESENCEZERO_DEFAULT_COUNTRY_CODE: 'Belgium' }, { PRESENCEZERO_DEFAULT_LOCALE: 'nl' },
  ])('rejects invalid or deployment-only settings without partially saving keys: %j', async configuration => {
    expect((await put({ configuration, googleApiKey: 'must-not-save' })).status).toBe(400)
    expect(await (await getDb()).select().from(settings)).toEqual([])
  })

  it('rejects inconsistent AI limits atomically and allows disabling a broken deployment', async () => {
    expect((await put({ configuration: { AI_AUDIT_ENABLED: 'true', OLLAMA_MODEL: 'local', AI_AUDIT_MIN_REVIEWS: '20', AI_AUDIT_MAX_REVIEWS: '10' }, googleApiKey: 'must-not-save' })).status).toBe(400)
    expect(await (await getDb()).select().from(settings)).toEqual([])
    vi.stubEnv('AI_AUDIT_ENABLED', 'true')
    vi.stubEnv('OLLAMA_MODEL', '')
    vi.stubEnv('AI_PROMPTS_DIR', '/nonexistent-private-directory')
    expect((await put({ configuration: { AI_AUDIT_ENABLED: 'false' } })).status).toBe(200)
    expect((await read()).aiAudit.enabled).toBe(false)
  })
})
