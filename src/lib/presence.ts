export type PresenceKey = 'none' | 'alive' | 'dead' | 'parked' | 'probe_failed'
type Dot = 'solid' | 'ring' | 'half' | 'muted' | 'unknown'
interface PresenceMeta { key: PresenceKey; label: string; dot: Dot; isLead: boolean }

const MAP: Record<PresenceKey, Omit<PresenceMeta, 'key'>> = {
  none:         { label: 'NONE',         dot: 'solid',   isLead: true },
  dead:         { label: 'DEAD',         dot: 'ring',    isLead: true },
  parked:       { label: 'PARKED',       dot: 'half',    isLead: true },
  alive:        { label: 'ALIVE',        dot: 'muted',   isLead: false },
  probe_failed: { label: 'PROBE-FAILED', dot: 'unknown', isLead: false },
}

export function presenceMeta(status: string | null): PresenceMeta {
  const key: PresenceKey = status && status in MAP ? (status as PresenceKey) : 'probe_failed'
  return { key, ...MAP[key] }
}
