import { describe, it, expect } from 'vitest'
import { presenceMeta } from '@/lib/presence'

describe('presenceMeta', () => {
  it('maps none to the jackpot lead (solid dot)', () => {
    expect(presenceMeta('none')).toEqual({ key: 'none', label: 'NONE', dot: 'solid', isLead: true })
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
