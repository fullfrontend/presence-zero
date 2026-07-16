const LEGAL_SUFFIXES = new Set(['inc', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company', 'plc', 'gmbh'])
const STOP_WORDS = new Set(['the', 'and', 'of', 'a', 'an'])

export function generateDomainCandidates(name: string, countryCode: string): string[] {
  const words = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(Boolean)
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) words.pop()
  const full = words.join('')
  const compact = words.filter(w => !STOP_WORDS.has(w)).join('')
  const bases = [...new Set([full, compact])].filter(b => b.length >= 3 && b.length <= 40)
  const cc = countryCode.toLowerCase()
  const tlds = ['com', ...(cc && cc !== 'us' ? [cc] : [])]
  const out: string[] = []
  for (const base of bases) for (const tld of tlds) out.push(`${base}.${tld}`)
  return out.slice(0, 4)
}
