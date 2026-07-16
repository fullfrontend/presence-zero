import { describe, it, expect } from 'vitest'
import { DEMO_SCAN } from '@/lib/demo-data'
import { presenceMeta } from '@/lib/presence'

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
})
