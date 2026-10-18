// Must be set before importing the db client so getDb()'s default never
// touches the real file DB (mirrors tests/db.test.ts).
process.env.DATABASE_URL = ':memory:'

import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { settings } from '@/db/schema'

describe('settings API', () => {
  // Each test starts from an empty settings table so assertions never depend
  // on execution order — the two secret keys are fixed strings, not per-test UUIDs.
  beforeEach(async () => {
    const db = await getDb()
    await db.delete(settings)
  })

  it('GET returns null for both secrets when nothing is stored', async () => {
    const route = await import('@/app/api/settings/route')
    const res = await route.GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ searxngEnabled: false, googleApiKey: null, apifyToken: null, braveSearchApiKey: null })
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
    expect(body).toEqual({ searxngEnabled: false, googleApiKey: '***', apifyToken: null, braveSearchApiKey: null })
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
    expect(await getRes.json()).toEqual({ searxngEnabled: false, googleApiKey: '***', apifyToken: null, braveSearchApiKey: null })
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
    expect(await getRes.json()).toEqual({ searxngEnabled: false, googleApiKey: null, apifyToken: '***', braveSearchApiKey: null })
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

})
