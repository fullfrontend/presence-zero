import { describe, it, expect } from 'vitest'
import { explainResultRow, pitchForRow, buildPitchText, bestAvailableDomain } from '@/lib/score-explain'
import { DEMO_SCAN } from '@/lib/demo-data'

const cornerCrumb = DEMO_SCAN.results.find(r => r.id === 'd1')!

describe('explainResultRow', () => {
  it('explains current evidence consistently', () => {
    const ex = explainResultRow(cornerCrumb)
    expect(ex.total).toBe(cornerCrumb.score)
    expect(ex.factors.reduce((s, f) => s + f.points, 0)).toBe(cornerCrumb.score)
    expect(ex.factors.find(f => f.key === 'exactDomain')!.hit).toBe(true)
  })
  it('handles a null-score probe_failed row without throwing', () => {
    const failed = DEMO_SCAN.results.find(r => r.presenceStatus === 'probe_failed')!
    expect(explainResultRow(failed).total).toBeNull()
  })
})

describe('bestAvailableDomain', () => {
  it('prefers an available .com', () => {
    expect(bestAvailableDomain([
      { domain: 'x.ca', available: true },
      { domain: 'x.com', available: true },
    ])).toBe('x.com')
  })
  it('falls back to any available domain', () => {
    expect(bestAvailableDomain([{ domain: 'x.ca', available: true }])).toBe('x.ca')
  })
  it('returns null when none are available', () => {
    expect(bestAvailableDomain([{ domain: 'x.com', available: false }])).toBeNull()
  })
})

describe('buildPitchText', () => {
  it('includes the headline, bullets, and suggested domain', () => {
    const pitch = pitchForRow(cornerCrumb, 'Ottawa, ON')
    const text = buildPitchText(pitch)
    expect(text).toContain(pitch.headline)
    for (const p of pitch.talkingPoints) expect(text).toContain(p)
    expect(text).toContain('cornercrumb.com')
    expect(text).not.toMatch(/undefined|null|NaN/)
  })
})
