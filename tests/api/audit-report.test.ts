import { expect, it } from 'vitest'
import { getDb } from '@/db/client'
import { businesses, scans } from '@/db/schema'
import type { AuditReport } from '@/core/audit/types'
import { buildExportQuery, matchesResultFilters } from '@/lib/result-filters'

process.env.DATABASE_URL = ':memory:'
const report: AuditReport = {
  version: 1, status: 'complete', mode: 'website', model: 'fixture', language: 'fr', createdAt: '2026-10-19T00:00:00.000Z',
  reason: null, verification: { status: 'matched', detail: 'Name and phone matched' }, summary: '=HYPERLINK("https://bad.example")',
  websiteQuality: 30, opportunityScore: 70, qualified: true, qualificationReasons: ['Observed opportunity'],
  findings: [{ observation: 'Description missing', recommendation: 'Add a description', evidenceId: 'page-1', quote: 'No meta description' }],
  brief: '+formula', evidence: [{ id: 'page-1', requestedUrl: 'https://restaurant.example/', url: 'https://restaurant.example/',
    retrievedAt: '2026-10-19T00:00:00.000Z', statusCode: 200, contentType: 'text/html', sha256: 'abc', text: '<script>bad()</script>',
    facts: ['No meta description'], truncated: false, error: null }],
}

it('returns persisted audit evidence and exports qualified live sites with formula-safe AI fields', async () => {
  const db = await getDb()
  await db.insert(scans).values({ id: 'audit-export', createdAt: new Date(), location: 'Charleroi', category: 'restaurant', provider: 'csv' })
  await db.insert(businesses).values([
    { id: 'audited', scanId: 'audit-export', name: 'Qualified website', phone: '123', reviewCount: 100, rating: 4.5, presenceStatus: 'alive', score: 0, auditReport: report },
    { id: 'plain', scanId: 'audit-export', name: 'Plain website', presenceStatus: 'alive', score: 0 },
  ])
  const results = await import('@/app/api/scans/[id]/results/route')
  const rows = await (await results.GET(new Request('http://test'), { params: Promise.resolve({ id: 'audit-export' }) })).json()
  expect(rows.results.find((r: { id: string }) => r.id === 'audited').auditReport).toEqual(report)
  expect(rows.results.find((r: { id: string }) => r.id === 'audited').score).toBe(70)
  expect(rows.results.find((r: { id: string }) => r.id === 'plain').score).toBeNull()
  const explained = rows.results.find((r: { id: string }) => r.id === 'audited').scoreExplanation
  expect(explained.factors.reduce((sum: number, f: { points: number }) => sum + f.points, 0)).toBe(70)
  const filtered = await (await results.GET(new Request('http://test?minScore=60'), { params: Promise.resolve({ id: 'audit-export' }) })).json()
  expect(filtered.results.map((r: { id: string }) => r.id)).toEqual(['audited'])
  const exp = await import('@/app/api/scans/[id]/export/route')
  const csv = await (await exp.GET(new Request('http://test?leadsOnly=1&auditOnly=1&minScore=60'), { params: Promise.resolve({ id: 'audit-export' }) })).text()
  expect(csv).toContain('Qualified website')
  expect(csv).not.toContain('Plain website')
  expect(csv).toContain("'=HYPERLINK")
  expect(csv).toContain("'+formula")
  expect(csv).toContain('audit_evidence')
  expect(csv).toContain('page-1')
})

it('keeps UI/export filter semantics aligned for local audit opportunities', () => {
  const row = { presenceStatus: 'alive', phone: null, score: 0, leadStatus: 'new', auditReport: report }
  expect(matchesResultFilters(row, { leadsOnly: true, auditOnly: true })).toBe(true)
  expect(matchesResultFilters({ ...row, auditReport: { ...report, status: 'failed' } }, { leadsOnly: true })).toBe(false)
  expect(buildExportQuery({ leadsOnly: true, auditOnly: true })).toContain('auditOnly=1')
  expect(matchesResultFilters(row, { minScore: 40 })).toBe(false)
})
