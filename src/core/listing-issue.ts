/** Evidence from a scan, not a claim that the source listing is still unchanged. */
export interface ListingIssue {
  sourceWebsite: string
  replacementWebsite: string
  sourceUrl: string | null
  sourceStatus: string
  sourceDetail: string
  matchDetail: string
  checkedAt: string
}

export const needsWebsiteRecovery = (status: string | null) =>
  ['dead', 'parked', 'configuration_error', 'probe_failed'].includes(status ?? '')

export function differentWebsite(a: string, b: string): boolean {
  try {
    const first = new URL(a.includes('://') ? a : `https://${a}`), second = new URL(b)
    if (!['http:', 'https:'].includes(second.protocol) || second.username || second.password) return false
    return first.hostname.replace(/^www\./, '') !== second.hostname.replace(/^www\./, '')
  } catch { return false }
}
