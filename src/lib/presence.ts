export type PresenceKey = 'pending' | 'not_found' | 'none' | 'facebook' | 'alive' | 'dead' | 'parked' | 'probe_failed'
type Dot = 'solid' | 'ring' | 'half' | 'muted' | 'unknown'
interface PresenceMeta { key: PresenceKey; label: string; dot: Dot; isLead: boolean }

const MAP: Record<PresenceKey, Omit<PresenceMeta, 'key'>> = {
  pending: { label: 'PENDING', dot: 'unknown', isLead: false },
  not_found:    { label: 'NO SITE FOUND', dot: 'solid', isLead: true },
  facebook:     { label: 'FACEBOOK', dot: 'half', isLead: true },
  none:         { label: 'UNVERIFIED',         dot: 'unknown',   isLead: true },
  dead:         { label: 'DEAD',         dot: 'ring',    isLead: true },
  parked:       { label: 'PARKED',       dot: 'half',    isLead: true },
  alive:        { label: 'ALIVE',        dot: 'muted',   isLead: false },
  probe_failed: { label: 'PROBE-FAILED', dot: 'unknown', isLead: false },
}

export function presenceMeta(status: string | null): PresenceMeta {
  const key: PresenceKey = status === null ? 'pending' : status && status in MAP ? (status as PresenceKey) : 'probe_failed'
  return { key, ...MAP[key] }
}

/**
 * Generic per-status copy for rows scanned before probe details were recorded.
 * Deliberately lists possibilities rather than asserting one — we genuinely do
 * not know which occurred for these rows.
 */
const FALLBACK: Record<PresenceKey, string> = {
  pending: 'Collected prospect. Website checks are still pending.',
  not_found: 'Search completed without finding a matching independent website. This is not proof that none exists.',
  facebook: 'A Facebook page was supplied, not an independent website. A separate website may still exist.',
  none: 'No website was listed on the source listing. This does not confirm that the business has no website.',
  dead: "The listed site didn't respond — DNS failure, connection refused, HTTP 5xx, or timeout.",
  parked: 'The listed site looked like a registrar parking page.',
  alive: 'The listed site responded normally.',
  probe_failed: 'The check itself failed.',
}

export function probeFallbackDetail(status: string | null): string {
  return FALLBACK[presenceMeta(status).key]
}
