import { describe, it, expect } from 'vitest'
import { presenceMeta, probeFallbackDetail } from '@/lib/presence'

describe('presenceMeta', () => {
  it('maps none to an unverified potential lead (solid dot)', () => {
    expect(presenceMeta('none')).toEqual({ key: 'none', label: 'UNVERIFIED', dot: 'solid', isLead: true })
  })
  it('maps dead and parked to leads with weaker dots', () => {
    expect(presenceMeta('dead').dot).toBe('ring')
    expect(presenceMeta('dead').isLead).toBe(true)
    expect(presenceMeta('parked').dot).toBe('half')
  })
  it('maps alive to a non-lead muted dot', () => {
    expect(presenceMeta('alive')).toMatchObject({ label: 'ALIVE', dot: 'muted', isLead: false })
  })
  it('maps probe_failed and null to unknown', () => {
    expect(presenceMeta('probe_failed')).toMatchObject({ label: 'PROBE-FAILED', dot: 'unknown', isLead: false })
    expect(presenceMeta(null)).toMatchObject({ key: 'probe_failed', dot: 'unknown', isLead: false })
  })
})

describe('probeFallbackDetail', () => {
  it('never claims to know which failure occurred', () => {
    expect(probeFallbackDetail('dead')).toMatch(/didn't respond/i)
    expect(probeFallbackDetail('dead')).toMatch(/or/i) // it lists possibilities, not a verdict
  })
  it('covers every status, including unknown input', () => {
    for (const s of ['none', 'alive', 'dead', 'parked', 'probe_failed', null, 'garbage']) {
      expect(probeFallbackDetail(s as string | null).length).toBeGreaterThan(0)
    }
  })
})
