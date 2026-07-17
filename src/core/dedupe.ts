const LEGAL_SUFFIXES = new Set(['inc', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company', 'plc', 'gmbh'])
const STOP_WORDS = new Set(['the', 'and', 'of', 'a', 'an'])

/**
 * Normalizes a business name into a stable comparison key, so the same shop
 * appearing across scans (with punctuation/case/suffix differences) collapses to
 * one key. Same normalization spirit as `generateDomainCandidates`.
 */
export function normalizeBusinessKey(name: string): string {
  const words = name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(Boolean)
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) words.pop()
  return words.filter(w => !STOP_WORDS.has(w)).join(' ')
}
