import { describe, it, expect } from 'vitest'
import { generateDomainCandidates } from '@/core/probes/domains'

describe('generateDomainCandidates', () => {
  it('normalizes punctuation, diacritics, ampersands and stop-words', () => {
    expect(generateDomainCandidates("Joe's Bakery & Café", 'ca')).toEqual([
      'joesbakeryandcafe.com', 'joesbakeryandcafe.ca', 'joesbakerycafe.com', 'joesbakerycafe.ca',
    ])
  })
  it('strips legal suffixes', () => {
    expect(generateDomainCandidates('Plumb Perfect Inc', 'us')).toEqual(['plumbperfect.com'])
  })
  it('skips ccTLD for us', () => {
    expect(generateDomainCandidates('Main Street Dental', 'us')).toEqual(['mainstreetdental.com'])
  })
  it('drops bases shorter than 3 chars', () => {
    expect(generateDomainCandidates('B Q', 'us')).toEqual([])
  })
  it('exact-match .com is always first when present', () => {
    const out = generateDomainCandidates('The Corner Store', 'ca')
    expect(out[0]).toBe('thecornerstore.com')
  })
  it('collapses to one base when full === compact (no stop-words)', () => {
    // "Corner Store" has no stop-words → full === compact → 2 candidates, not 4
    expect(generateDomainCandidates('Corner Store', 'ca')).toEqual(['cornerstore.com', 'cornerstore.ca'])
  })
  it('keeps a name that is entirely a legal suffix', () => {
    expect(generateDomainCandidates('Inc', 'us')).toEqual(['inc.com'])
  })
  it('drops bases longer than 40 chars', () => {
    const long = 'a'.repeat(41)
    expect(generateDomainCandidates(long, 'us')).toEqual([])
  })
})
