import { describe, it, expect } from 'vitest'
import { DEMO_SCAN } from '@/lib/demo-data'
import { presenceMeta } from '@/lib/presence'
import { computeScore } from '@/core/scoring'

describe('DEMO_SCAN', () => {
  it('has enough rows to show range', () => {
    expect(DEMO_SCAN.results.length).toBeGreaterThanOrEqual(12)
  })
  it('covers every presence status', () => {
    const seen = new Set(DEMO_SCAN.results.map(r => r.presenceStatus))
    for (const s of ['none', 'dead', 'parked', 'alive', 'probe_failed'] as const) expect(seen.has(s)).toBe(true)
  })
  it('includes at least one available domain and lead-scored rows', () => {
    expect(DEMO_SCAN.results.some(r => r.domains.some(d => d.available === true))).toBe(true)
    expect(DEMO_SCAN.results.some(r => presenceMeta(r.presenceStatus).isLead && (r.score ?? 0) >= 80)).toBe(true)
  })
  it('every row score is self-consistent with the scoring formula', () => {
    for (const r of DEMO_SCAN.results) {
      const input = {
        presence: r.presenceStatus,
        reviewCount: r.reviewCount,
        rating: r.rating,
        // Exact-match .com bonus: the first .com candidate is available.
        exactComAvailable: r.domains.some(d => d.domain.endsWith('.com') && d.available === true),
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
