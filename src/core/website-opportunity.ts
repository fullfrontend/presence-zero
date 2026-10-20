import type { AuditReport } from './audit/types'

/** Only a completed, identity-matched website audit is evidence for this score. */
export function websiteOpportunity(report?: AuditReport | null): number | null {
  if (report?.status !== 'complete' || report.mode !== 'website' || report.verification.status !== 'matched' ||
    typeof report.websiteQuality !== 'number' || !Number.isFinite(report.websiteQuality) || report.websiteQuality < 0 || report.websiteQuality > 100) return null
  return Math.round(100 - report.websiteQuality)
}
