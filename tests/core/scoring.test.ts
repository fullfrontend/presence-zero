import { describe, it, expect } from 'vitest'
import { computeScore, explainScore } from '@/core/scoring'

describe('computeScore', () => {
  it('hot lead: no site, 80 reviews, 4.6 rating, exact domain free, phone listed = 100', () => {
    expect(computeScore({ presence: 'not_found', reviewCount: 80, rating: 4.6, exactComAvailable: true, hasPhone: true })).toBe(100)
  })
  it('cool lead: no site, 3 reviews, no rating, no domain, no phone', () => {
    // 40 + round(3/50*25)=2 → 42
    expect(computeScore({ presence: 'not_found', reviewCount: 3, rating: null, exactComAvailable: false, hasPhone: false })).toBe(42)
  })
  it('parked site scores lower than dead which is lower than none', () => {
    const base = { reviewCount: 0, rating: null, exactComAvailable: false, hasPhone: false }
    const none = computeScore({ ...base, presence: 'not_found' })
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
    const at50 = computeScore({ presence: 'not_found', reviewCount: 50, rating: null, exactComAvailable: false, hasPhone: false })
    const at500 = computeScore({ presence: 'not_found', reviewCount: 500, rating: null, exactComAvailable: false, hasPhone: false })
    expect(at50).toBe(65) // 40 + 25
    expect(at500).toBe(at50)
  })
})

describe('explainScore', () => {
  it('factors sum to computeScore for a full lead', () => {
    const input = { presence: 'not_found', reviewCount: 200, rating: 4.7, exactComAvailable: true, hasPhone: true } as const
    const ex = explainScore(input)
    expect(ex.total).toBe(computeScore(input))
    expect(ex.factors.reduce((s, f) => s + f.points, 0)).toBe(ex.total)
  })
  it('reconciles the exactDomain factor to a supplied total', () => {
    const input = { presence: 'not_found', reviewCount: 200, rating: 4.7, exactComAvailable: false, hasPhone: true } as const
    const total = computeScore({ ...input, exactComAvailable: true })
    const ex = explainScore(input, { total })
    const dom = ex.factors.find(f => f.key === 'exactDomain')!
    expect(dom.points).toBe(15)
    expect(dom.hit).toBe(true)
    expect(ex.total).toBe(total)
    expect(ex.factors.reduce((s, f) => s + f.points, 0)).toBe(total)
  })
  it('reconciliation clamps a residual into the exactDomain range', () => {
    // total below the sum of unambiguous factors → exactDomain clamps to 0, never negative
    const input = { presence: 'not_found', reviewCount: 50, rating: 5, exactComAvailable: true, hasPhone: true } as const
    const ex = explainScore(input, { total: 60 })
    const dom = ex.factors.find(f => f.key === 'exactDomain')!
    expect(dom.points).toBeGreaterThanOrEqual(0)
    expect(dom.points).toBeLessThanOrEqual(15)
    expect(ex.total).toBe(60)
  })
  it('alive and probe_failed explain to zero with all factors missed', () => {
    for (const presence of ['alive', 'probe_failed'] as const) {
      const ex = explainScore({ presence, reviewCount: 99, rating: 5, exactComAvailable: true, hasPhone: true })
      expect(ex.total).toBe(0)
      expect(ex.factors.every(f => f.points === 0 && !f.hit)).toBe(true)
    }
  })
  it('each factor reports key, hit and max', () => {
    const ex = explainScore({ presence: 'dead', reviewCount: 0, rating: 3, exactComAvailable: false, hasPhone: false })
    const byKey = Object.fromEntries(ex.factors.map(f => [f.key, f]))
    expect(byKey.presence.hit).toBe(true)
    expect(byKey.reviews.hit).toBe(false)
    expect(byKey.reviews.max).toBe(25)
    expect(byKey.rating.hit).toBe(false)
    expect(byKey.phone.hit).toBe(false)
    expect(ex.factors.map(f => f.key)).toEqual(['presence', 'reviews', 'rating', 'exactDomain', 'phone'])
  })
})

it('scores Facebook distinctly from absent and live sites, with a consistent breakdown', () => {
  const base = { reviewCount: 50, rating: 5, exactComAvailable: true, hasPhone: true }
  const explanation = explainScore({ ...base, presence: 'facebook' })
  expect(explanation.total).toBe(85)
  expect(explanation.factors[0].points).toBe(25)
  expect(explanation.factors.reduce((sum, factor) => sum + factor.points, 0)).toBe(85)
  expect(explanation.total).toBeLessThan(computeScore({ ...base, presence: 'not_found' }))
  expect(explanation.total).toBeGreaterThan(computeScore({ ...base, presence: 'alive' }))
})

it('orders no site found, Facebook, unverified and live presence with equal signals', () => {
  const base = { reviewCount: 50, rating: 5, exactComAvailable: true, hasPhone: true }
  const scores = (['not_found', 'facebook', 'none', 'alive'] as const)
    .map(presence => computeScore({ ...base, presence }))
  expect(scores).toEqual([100, 85, 75, 0])
})
