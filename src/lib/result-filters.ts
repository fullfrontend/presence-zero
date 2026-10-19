import type { AuditReport } from '@/core/audit/types'
import { presenceMeta } from '@/lib/presence'

export type LeadStatus = 'new' | 'contacted' | 'replied' | 'won' | 'lost' | 'skipped'

export interface FilterableRow {
  auditReport?: AuditReport | null
  presenceStatus: string | null
  score: number | null
  phone: string | null
  leadStatus: string
}

export interface ResultFilterOpts {
  minScore?: number
  leadsOnly?: boolean
  auditOnly?: boolean
  hasPhoneOnly?: boolean
  leadStatus?: LeadStatus | ''
}

export function matchesResultFilters(r: FilterableRow, opts: ResultFilterOpts): boolean {
  if (opts.minScore != null && opts.minScore > 0 && (r.score ?? 0) < opts.minScore) return false
  if (opts.auditOnly && !(r.auditReport?.status === 'complete' && r.auditReport.mode === 'website')) return false
  if (opts.leadsOnly && !isQualifiedLead(r)) return false
  if (opts.hasPhoneOnly && !r.phone) return false
  if (opts.leadStatus && r.leadStatus !== opts.leadStatus) return false
  return true
}

/** Build query string for CSV export from the same filters the table shows. */
export function buildExportQuery(opts: ResultFilterOpts): string {
  const params = new URLSearchParams()
  if (opts.minScore != null && opts.minScore > 0) params.set('minScore', String(opts.minScore))
  if (opts.auditOnly) params.set('auditOnly', '1')
  if (opts.leadsOnly) params.set('leadsOnly', '1')
  if (opts.hasPhoneOnly) params.set('hasPhone', '1')
  if (opts.leadStatus) params.set('leadStatus', opts.leadStatus)
  const q = params.toString()
  return q ? `?${q}` : ''
}

/** Existing presence leads plus independently audited website opportunities. */
export function isQualifiedLead(row: { presenceStatus: string | null; auditReport?: AuditReport | null }): boolean {
  return presenceMeta(row.presenceStatus).isLead || (row.presenceStatus === 'alive' && row.auditReport?.status === 'complete' && row.auditReport.verification.status === 'matched' && row.auditReport.qualified === true)
}
