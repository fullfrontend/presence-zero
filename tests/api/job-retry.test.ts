import { expect, it } from 'vitest'
import { getDb } from '@/db/client'
import { scans, businesses, scanJobs } from '@/db/schema'
import { GET, POST } from '@/app/api/scans/[id]/jobs/route'
process.env.DATABASE_URL = ':memory:'
const ctx = { params: Promise.resolve({ id: 'retry-api' }) }
it('lists only failed tasks with business names and validates individual/bulk retry requests', async () => {
  const db = await getDb()
  await db.insert(scans).values({ id: 'retry-api', createdAt: new Date(), location: 'Test', category: 'Test', provider: 'csv', status: 'done' })
  await db.insert(businesses).values({ id: 'retry-business', scanId: 'retry-api', name: 'Example' })
  await db.insert(scanJobs).values([
    { id: 'failed', scanId: 'retry-api', businessId: 'retry-business', kind: 'audit', status: 'failed', error: 'Audit unavailable', attempts: 2 },
    { id: 'success', scanId: 'retry-api', businessId: 'retry-business', kind: 'phone', status: 'done' },
  ])
  const listing = await (await GET(new Request('http://test'), ctx)).json()
  expect(listing.jobs).toHaveLength(1)
  expect(listing.jobs[0]).toMatchObject({ id: 'failed', businessName: 'Example', error: 'Audit unavailable', attempts: 2 })
  const request = (body: unknown) => new Request('http://test', { method: 'POST', body: JSON.stringify(body) })
  for (const body of [{}, { all: false }, { all: true, jobId: 'failed' }, { jobId: '' }]) expect((await POST(request(body), ctx)).status).toBe(400)
  expect((await POST(request({ jobId: 'success' }), ctx)).status).toBe(409)
  expect((await POST(request({ jobId: 'failed' }), ctx)).status).toBe(202)
  expect((await (await GET(new Request('http://test'), ctx)).json()).jobs).toEqual([])
  expect((await (await POST(request({ all: true }), ctx)).json()).retried).toBe(0)
  expect((await GET(new Request('http://test'), { params: Promise.resolve({ id: 'missing' }) })).status).toBe(404)
})
