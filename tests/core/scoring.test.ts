import { describe, it, expect } from 'vitest'
import { computeScore } from '@/core/scoring'

describe('computeScore', () => {
  it('hot lead: no site, 80 reviews, 4.6 rating, exact domain free, phone listed = 100', () => {
    expect(computeScore({ presence: 'none', reviewCount: 80, rating: 4.6, exactComAvailable: true, hasPhone: true })).toBe(100)
  })
  it('cool lead: no site, 3 reviews, no rating, no domain, no phone', () => {
    // 40 + round(3/50*25)=2 → 42
    expect(computeScore({ presence: 'none', reviewCount: 3, rating: null, exactComAvailable: false, hasPhone: false })).toBe(42)
  })
  it('parked site scores lower than dead which is lower than none', () => {
    const base = { reviewCount: 0, rating: null, exactComAvailable: false, hasPhone: false }
    const none = computeScore({ ...base, presence: 'none' })
    const dead = computeScore({ ...base, presence: 'dead' })
    const parked = computeScore({ ...base, presence: 'parked' })
    expect(none).toBeGreaterThan(dead)
    expect(dead).toBeGreaterThan(parked)
  })
  it('alive and probe_failed score 0', () => {
    const base = { reviewCount: 99, rating: 5, exactComAvailable: true, hasPhone: true }
    expect(computeScore({ ...base, presence: 'alive' })).toBe(0)
    expect(computeScore({ ...base, presence: 'probe_failed' })).toBe(0)
  })
  it('review points cap at 50 reviews', () => {
    const at50 = computeScore({ presence: 'none', reviewCount: 50, rating: null, exactComAvailable: false, hasPhone: false })
    const at500 = computeScore({ presence: 'none', reviewCount: 500, rating: null, exactComAvailable: false, hasPhone: false })
    expect(at50).toBe(65) // 40 + 25
    expect(at500).toBe(at50)
  })
})
