import { describe, it, expect } from 'vitest'
import { matchesResultFilters, buildExportQuery } from '@/lib/result-filters'

const row = (
  over: Partial<{ presenceStatus: string | null; score: number | null; phone: string | null; leadStatus: string }>,
) => ({
  presenceStatus: 'none' as string | null,
  score: 80 as number | null,
  phone: '(555) 0100' as string | null,
  leadStatus: 'new',
  ...over,
})

describe('matchesResultFilters', () => {
  it('excludes probe_failed when leadsOnly (unlike !== alive)', () => {
    expect(matchesResultFilters(row({ presenceStatus: 'probe_failed' }), { leadsOnly: true })).toBe(false)
    expect(matchesResultFilters(row({ presenceStatus: 'none' }), { leadsOnly: true })).toBe(true)
    expect(matchesResultFilters(row({ presenceStatus: 'alive' }), { leadsOnly: true })).toBe(false)
  })

  it('applies minScore, hasPhone, and leadStatus', () => {
    expect(matchesResultFilters(row({ score: 30 }), { minScore: 40 })).toBe(false)
    expect(matchesResultFilters(row({ phone: null }), { hasPhoneOnly: true })).toBe(false)
    expect(matchesResultFilters(row({ leadStatus: 'contacted' }), { leadStatus: 'new' })).toBe(false)
    expect(matchesResultFilters(row({ leadStatus: 'new' }), { leadStatus: 'new' })).toBe(true)
  })
})

describe('buildExportQuery', () => {
  it('encodes the visible filter set', () => {
    expect(buildExportQuery({ minScore: 40, leadsOnly: true, hasPhoneOnly: true, leadStatus: 'contacted' }))
      .toBe('?minScore=40&leadsOnly=1&hasPhone=1&leadStatus=contacted')
    expect(buildExportQuery({ minScore: 0, leadsOnly: false })).toBe('')
  })
})
