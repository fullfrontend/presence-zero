// Must be set before importing the db client so getDb()'s default never
// touches the real file DB (mirrors tests/db.test.ts).
process.env.DATABASE_URL = ':memory:'

import { describe, it, expect } from 'vitest'
import { getDb } from '@/db/client'
import { scans } from '@/db/schema'

describe('PATCH /api/scans/[id]', () => {
  it('updates pinned, then label + archived on a second call', async () => {
    const db = await getDb()
    await db.insert(scans).values({
      id: 'scan-patch-1', createdAt: new Date(), location: 'Ottawa, ON', category: 'bakery',
      countryCode: 'ca', provider: 'csv',
    })

    const route = await import('@/app/api/scans/[id]/route')

    const res1 = await route.PATCH(new Request('http://t', {
      method: 'PATCH', body: JSON.stringify({ pinned: true }),
    }), { params: Promise.resolve({ id: 'scan-patch-1' }) })
    expect(res1.status).toBe(200)
    const body1 = await res1.json()
    expect(body1.pinned).toBe(true)
    expect(body1.archived).toBe(false)

    const res2 = await route.PATCH(new Request('http://t', {
      method: 'PATCH', body: JSON.stringify({ label: 'x', archived: true }),
    }), { params: Promise.resolve({ id: 'scan-patch-1' }) })
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2.label).toBe('x')
    expect(body2.archived).toBe(true)
    expect(body2.pinned).toBe(true) // unchanged from the previous PATCH
  })

  it('rejects an invalid body with 400', async () => {
    const db = await getDb()
    await db.insert(scans).values({
      id: 'scan-patch-2', createdAt: new Date(), location: 'Ottawa, ON', category: 'bakery',
      countryCode: 'ca', provider: 'csv',
    })

    const route = await import('@/app/api/scans/[id]/route')
    const res = await route.PATCH(new Request('http://t', {
      method: 'PATCH', body: JSON.stringify({}),
    }), { params: Promise.resolve({ id: 'scan-patch-2' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 for a missing scan id', async () => {
    const route = await import('@/app/api/scans/[id]/route')
    const res = await route.PATCH(new Request('http://t', {
      method: 'PATCH', body: JSON.stringify({ pinned: true }),
    }), { params: Promise.resolve({ id: 'does-not-exist' }) })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Scan not found')
  })
})
