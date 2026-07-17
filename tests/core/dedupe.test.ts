import { describe, it, expect } from 'vitest'
import { normalizeBusinessKey } from '@/core/dedupe'

describe('normalizeBusinessKey', () => {
  it('ignores a leading article', () => {
    expect(normalizeBusinessKey('The Daily Crumb')).toBe(normalizeBusinessKey('Daily Crumb'))
  })
  it('treats & and "and" the same', () => {
    expect(normalizeBusinessKey('Smith & Co.')).toBe(normalizeBusinessKey('Smith and Company'))
  })
  it('is case- and punctuation-insensitive', () => {
    expect(normalizeBusinessKey('  Corner-Crumb  BAKEHOUSE!! ')).toBe(normalizeBusinessKey('corner crumb bakehouse'))
  })
  it('drops legal suffixes', () => {
    expect(normalizeBusinessKey('Acme LLC')).toBe(normalizeBusinessKey('Acme'))
    expect(normalizeBusinessKey('Acme Inc')).toBe(normalizeBusinessKey('Acme'))
  })
  it('returns empty string for blank/punctuation-only input', () => {
    expect(normalizeBusinessKey('   ')).toBe('')
    expect(normalizeBusinessKey('!!!')).toBe('')
  })
  it('keeps genuinely different names distinct', () => {
    expect(normalizeBusinessKey('Corner Crumb')).not.toBe(normalizeBusinessKey('Stone Mill'))
  })
})
