import { expect, it } from 'vitest'
import type { AuditReport } from '@/core/audit/types'
import { explainBusinessScore } from '@/core/business-score'
import { computeScore, explainScore } from '@/core/scoring'
import { websiteOpportunity } from '@/core/website-opportunity'

const report: AuditReport = {
  version: 1, status: 'complete', mode: 'website', model: 'fixture', language: 'fr', createdAt: '2026-10-20T00:00:00Z',
  reason: null, verification: { status: 'matched', detail: 'Matching business' }, summary: 'Observed evidence',
  websiteQuality: 20, opportunityScore: 80, qualified: true, qualificationReasons: [], findings: [], brief: '', evidence: [],
}
const input = { presence: 'alive' as const, reviewCount: 100, rating: 5, exactComAvailable: true, hasPhone: true }

it('makes weaker sites stronger leads on one bounded scale, with all other commercial signals present', () => {
  for (const [quality, expected] of [[0, 100], [20, 80], [90, 10], [100, 0]]) {
    const auditReport = { ...report, websiteQuality: quality }
    expect(computeScore({ ...input, auditReport })).toBe(expected)
    const explanation = explainScore({ ...input, auditReport })
    expect(explanation.total).toBe(expected)
    expect(explanation.factors.reduce((sum, factor) => sum + factor.points, 0)).toBe(expected)
  }
})
it('does not score unsupported or non-verified AI reports', () => {
  const invalid = [null, { ...report, status: 'failed' as const }, { ...report, status: 'skipped' as const },
    { ...report, mode: 'profile' as const }, { ...report, verification: { status: 'unverified' as const, detail: '' } },
    ...[null, NaN, Infinity, -1, 101].map(websiteQuality => ({ ...report, websiteQuality }))]
  for (const auditReport of invalid) {
    expect(websiteOpportunity(auditReport)).toBeNull()
    expect(computeScore({ ...input, auditReport })).toBeNull()
  }
})
it('keeps dead/parked website evidence authoritative over an older audit', () => {
  for (const presence of ['dead', 'parked', 'none', 'facebook', 'probe_failed'] as const) {
    expect(computeScore({ ...input, presence, auditReport: report })).toBe(computeScore({ ...input, presence }))
  }
})
it('recalculates historical scores using business evidence, ignoring stale AI opportunity', () => {
  const row = { name: 'Test', phone: '123', rating: 5, reviewCount: 100, presenceStatus: 'alive', auditReport: { ...report, opportunityScore: 999 } }
  expect(explainBusinessScore(row, []).total).toBe(80)
  expect(explainBusinessScore({ ...row, phone: null, reviewCount: null, rating: null }, []).total).toBe(40)
})
