import { describe, it, expect } from 'vitest'
import { generateDomainCandidates } from '@/core/probes/domains'

describe('generateDomainCandidates', () => {
  it('normalizes punctuation, diacritics, ampersands and stop-words', () => {
    expect(generateDomainCandidates("Joe's Bakery & Café", 'ca')).toEqual([
      'joesbakeryandcafe.ca', 'joesbakeryandcafe.com', 'joesbakerycafe.ca', 'joesbakerycafe.com',
    ])
  })
  it('strips legal suffixes', () => {
    expect(generateDomainCandidates('Plumb Perfect Inc', 'us')).toEqual(['plumbperfect.us', 'plumbperfect.com'])
  })
  it('includes the national TLD for the US too', () => {
    expect(generateDomainCandidates('Main Street Dental', 'us')).toEqual(['mainstreetdental.us', 'mainstreetdental.com'])
  })
  it('drops bases shorter than 3 chars', () => {
    expect(generateDomainCandidates('B Q', 'us')).toEqual([])
  })
  it('national extension is checked first', () => {
    const out = generateDomainCandidates('The Corner Store', 'ca')
    expect(out[0]).toBe('thecornerstore.ca')
  })
  it('collapses to one base when full === compact (no stop-words)', () => {
    // "Corner Store" has no stop-words → full === compact → 2 candidates, not 4
    expect(generateDomainCandidates('Corner Store', 'ca')).toEqual(['cornerstore.ca', 'cornerstore.com'])
  })
  it('keeps a name that is entirely a legal suffix', () => {
    expect(generateDomainCandidates('Inc', 'us')).toEqual(['inc.us', 'inc.com'])
  })
  it('drops bases longer than 40 chars', () => {
    const long = 'a'.repeat(41)
    expect(generateDomainCandidates(long, 'us')).toEqual([])
  })
})

it('normalizes country codes and maps ISO GB to the UK TLD', () => {
  expect(generateDomainCandidates('Chez Léon', ' BE ')).toEqual(['chezleon.be', 'chezleon.com'])
  expect(generateDomainCandidates('Bakery', 'gb')).toEqual(['bakery.uk', 'bakery.com'])
  expect(generateDomainCandidates('Bakery', '../')).toEqual(['bakery.com'])
})
