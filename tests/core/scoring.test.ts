import { it, expect } from 'vitest'
import { computeScore, explainScore } from '@/core/scoring'
const full = { reviewCount: 100, rating: 4.5, exactDomainAvailable: true, hasPhone: true }
it('requires all commercial signals for maximum priority', () => {
  expect(computeScore({ ...full, presence: 'not_found' })).toBe(100)
  expect(computeScore({ presence: 'not_found', exactDomainAvailable: false, hasPhone: false })).toBe(45)
  expect(computeScore({ ...full, presence: 'not_found', hasPhone: false })).toBe(80)
})
it('orders proven absence, broken sites, Facebook and unverified absence', () => {
  expect((['not_found', 'dead', 'parked', 'facebook', 'none'] as const).map(presence => computeScore({ ...full, presence }))).toEqual([100, 95, 90, 75, 40])
})
it('does not confuse unknown need with rejection', () => {
  for (const presence of [null, 'alive', 'probe_failed'] as const) expect(computeScore({ ...full, presence })).toBeNull()
  for (const leadStatus of ['won', 'lost', 'skipped']) expect(computeScore({ ...full, presence: 'not_found', leadStatus })).toBe(0)
})
it('weights reputation by review sample and caps volume', () => {
  expect(computeScore({ ...full, presence: 'not_found', reviewCount: 10000 })).toBe(100)
  const few = explainScore({ ...full, presence: 'not_found', reviewCount: 1 })
  expect(few.factors.find(f => f.key === 'rating')?.points).toBe(1)
  expect(few.factors.find(f => f.key === 'reviews')?.points).toBe(4)
})
it('keeps rounded factors bounded and equal to the displayed total', () => {
  for (const presence of ['not_found', 'dead', 'parked', 'facebook', 'none'] as const) {
    for (const reviewCount of [0, 1, 5, 20, 50, 100]) {
      const ex = explainScore({ ...full, presence, reviewCount, rating: 3.7 })
      expect(ex.factors.reduce((sum, f) => sum + f.points, 0)).toBe(ex.total)
      for (const f of ex.factors) { expect(f.points).toBeGreaterThanOrEqual(0); expect(f.points).toBeLessThanOrEqual(f.max) }
    }
  }
})
it('missing and invalid activity evidence never earns points', () => {
  for (const value of [null, NaN, Infinity, -1]) {
    const ex = explainScore({ presence: 'not_found', reviewCount: value, rating: value, exactDomainAvailable: false, hasPhone: false })
    expect(ex.total).toBe(45)
  }
})

it('weights a confirmed configuration issue below a broken site, without requiring a new domain', () => {
  expect(computeScore({ ...full, presence: 'configuration_error', exactDomainAvailable: false })).toBe(80)
  expect(computeScore({ presence: 'configuration_error', hasPhone: false, exactDomainAvailable: false })).toBe(40)
  const ex = explainScore({ ...full, presence: 'configuration_error' })
  expect(ex.factors.reduce((sum, f) => sum + f.points, 0)).toBe(80)
})
