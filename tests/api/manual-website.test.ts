import { it, expect } from 'vitest'
import { getDb } from '@/db/client'
import { businesses, scans, settings } from '@/db/schema'
import { POST } from '@/app/api/businesses/[id]/website/route'
process.env.DATABASE_URL = ':memory:'
it('validates and normalizes manual websites and reports the saved AI override', async () => {
  const db = await getDb()
  await db.insert(scans).values({ id: 'manual', createdAt: new Date(), location: 'Test', category: 'Test', provider: 'csv', status: 'done', phase: 'done' })
  await db.insert(businesses).values({ id: 'manual-b', scanId: 'manual', name: 'Business' })
  await db.insert(settings).values({ key: 'config:AI_AUDIT_ENABLED', value: 'true' })
  const ctx = { params: Promise.resolve({ id: 'manual-b' }) }
  const request = (website: unknown) => new Request('http://test', { method: 'POST', body: JSON.stringify({ website }) })
  for (const url of ['', 'javascript:alert(1)', 'file:///tmp/private', 'https://user:pass@example.com', 'https://facebook.com/test', 'bad url', 123]) {
    expect((await POST(request(url), ctx)).status).toBe(400)
  }
  const response = await POST(request(' example.com '), ctx)
  expect(response.status).toBe(202)
  expect(await response.json()).toMatchObject({ website: 'https://example.com/', aiEnabled: true })
  expect((await POST(request('https://example.com'), { params: Promise.resolve({ id: 'missing' }) })).status).toBe(404)
})
