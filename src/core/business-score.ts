import { explainScore } from './scoring'
import { exactDomainCandidates } from './probes/domains'
import type { AuditReport } from './audit/types'
import type { PresenceStatus } from './types'

export interface ScorableBusiness {
  name: string; presenceStatus: string | null; phone: string | null
  rating: number | null; reviewCount: number | null; leadStatus?: string
  auditReport?: AuditReport | null
}
export function explainBusinessScore(row: ScorableBusiness, domains: { domain: string; available: boolean | null }[], countryCode = 'us') {
  const exact = exactDomainCandidates(row.name, countryCode)
  return explainScore({ presence: row.presenceStatus as PresenceStatus | null, auditReport: row.auditReport,
    leadStatus: row.leadStatus, rating: row.rating, reviewCount: row.reviewCount, hasPhone: !!row.phone?.trim(),
    exactDomainAvailable: domains.some(domain => exact.includes(domain.domain) && domain.available === true) })
}
