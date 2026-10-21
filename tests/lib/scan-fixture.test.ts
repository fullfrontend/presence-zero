import { describe, it, expect } from 'vitest'
import { SAMPLE_SCAN } from '../fixtures/scan-results'
import { presenceMeta } from '@/lib/presence'
import { computeScore } from '@/core/scoring'
import { exactDomainCandidates } from '@/core/probes/domains'

describe('SAMPLE_SCAN', () => {
  it('has enough rows to show range', () => {
    expect(SAMPLE_SCAN.results.length).toBeGreaterThanOrEqual(12)
  })
  it('covers every presence status', () => {
    const seen = new Set(SAMPLE_SCAN.results.map(r => r.presenceStatus))
    for (const s of ['none', 'dead', 'parked', 'alive', 'probe_failed'] as const) expect(seen.has(s)).toBe(true)
  })
  it('includes at least one available domain and lead-scored rows', () => {
    expect(SAMPLE_SCAN.results.some(r => r.domains.some(d => d.available === true))).toBe(true)
    expect(SAMPLE_SCAN.results.some(r => presenceMeta(r.presenceStatus).isLead && (r.score ?? 0) >= 80)).toBe(true)
  })
  it('every row score is self-consistent with the scoring formula', () => {
    for (const r of SAMPLE_SCAN.results) {
      const input = {
        presence: r.presenceStatus,
        leadStatus: r.leadStatus,
        reviewCount: r.reviewCount,
        rating: r.rating,
        // Exact business name in the scan country or .com.
        exactDomainAvailable: r.domains.some(d => exactDomainCandidates(r.name, 'ca').includes(d.domain) && d.available === true),
        hasPhone: !!r.phone,
      }
      const expected = computeScore(input)
      // Non-leads have no meaningful score; the demo may leave probe_failed rows with authored values.
      if (presenceMeta(r.presenceStatus).isLead) {
        expect(r.score, r.name).toBe(expected)
      }
    }
  })
})
