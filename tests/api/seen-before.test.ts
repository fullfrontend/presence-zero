import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'

process.env.DATABASE_URL = ':memory:'

describe('results route seenBefore flag', () => {
  it('flags a business seen in an earlier scan of the same location', async () => {
    const { getDb } = await import('@/db/client')
    const { scans, businesses } = await import('@/db/schema')
    const db = await getDb()

    const earlier = randomUUID()
    const later = randomUUID()
    const other = randomUUID()
    const base = { category: 'bakery', countryCode: 'ca', provider: 'csv', status: 'done' as const, phase: 'done' as const }

    await db.insert(scans).values([
      { id: earlier, createdAt: new Date(1000), location: 'Ottawa, ON', ...base },
      { id: later, createdAt: new Date(2000), location: 'Ottawa, ON', ...base },
      { id: other, createdAt: new Date(500), location: 'Toronto, ON', ...base },
    ])

    const biz = (scanId: string, name: string) => ({
      id: randomUUID(), scanId, name, presenceStatus: 'none' as const, score: 50,
    })
    await db.insert(businesses).values([
      biz(earlier, 'The Corner Crumb'),          // earlier, Ottawa
      biz(other, 'Fresh Unique Co'),             // earlier-but-different-location
      biz(later, 'Corner Crumb'),                // repeat (normalizes to same key) → seenBefore
      biz(later, 'Fresh Unique Co'),             // only seen in a DIFFERENT location → not seenBefore
      biz(later, 'Totally New Shop'),            // never seen → not seenBefore
    ])

    const resultsRoute = await import('@/app/api/scans/[id]/results/route')
    const res = await resultsRoute.GET(
      new Request('http://t/api/x/results'),
      { params: Promise.resolve({ id: later }) },
    )
    const { results } = await res.json()
    const byName = Object.fromEntries(results.map((r: { name: string; seenBefore: boolean }) => [r.name, r.seenBefore]))

    expect(byName['Corner Crumb']).toBe(true)
    expect(byName['Fresh Unique Co']).toBe(false)
    expect(byName['Totally New Shop']).toBe(false)
  })
})
