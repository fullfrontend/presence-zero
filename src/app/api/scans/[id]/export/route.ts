import { effectiveLeadScore } from '@/core/website-opportunity'
import { desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { businesses, domainCandidates, scanJobs } from '@/db/schema'
import { matchesResultFilters } from '@/lib/result-filters'
import { exportQuerySchema } from '@/server/validation'

function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v)
  // Neutralize spreadsheet formula injection: a leading =, +, -, @, tab or CR
  // can execute as a formula in Excel/Sheets. Prefix with a single quote.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const url = new URL(req.url)
  const parsed = exportQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { minScore, leadsOnly, auditOnly, hasPhone, leadStatus } = parsed.data

  const db = await getDb()
  const rows = await db.select().from(businesses).where(eq(businesses.scanId, id)).orderBy(desc(businesses.score))
  const jobs = await db.select({ businessId: scanJobs.businessId, status: scanJobs.status }).from(scanJobs).where(eq(scanJobs.scanId, id))
  const filtered = rows.map(row => ({ ...row, score: effectiveLeadScore(row), enrichment: jobs.filter(job => job.businessId === row.id) })).filter(r => matchesResultFilters(r, {
    minScore,
    auditOnly,
    leadsOnly: leadsOnly || false,
    hasPhoneOnly: hasPhone || false,
    leadStatus: leadStatus ?? '',
  })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const ids = filtered.map(r => r.id)
  const candidates = ids.length
    ? await db.select().from(domainCandidates).where(inArray(domainCandidates.businessId, ids))
    : []
  const available = new Map<string, string[]>()
  for (const c of candidates) {
    if (c.available === true) available.set(c.businessId, [...(available.get(c.businessId) ?? []), c.domain])
  }
  const header = 'name,address,phone,category,rating,review_count,website,presence,probe_detail,score,lead_status,note,available_domains,facebook_url,source_url,audit_status,audit_model,audit_language,website_quality,audit_opportunity_score,audit_qualified,audit_summary,audit_brief,audit_findings,audit_evidence,audit_reason,audit_preparation_model,audit_preparation_status,audit_prompt_profile,audit_prompt_revision'
  const lines = filtered.map(r => [
    r.name, r.address, r.phone, r.category, r.rating, r.reviewCount, r.listedWebsite,
    r.presenceStatus, r.probeDetail, r.score, r.leadStatus, r.note, (available.get(r.id) ?? []).join(' '),
    r.facebookUrl, r.sourceUrl, r.auditReport?.status, r.auditReport?.model, r.auditReport?.language,
    r.auditReport?.websiteQuality, r.auditReport?.opportunityScore, r.auditReport?.qualified,
    r.auditReport?.summary, r.auditReport?.brief,
    r.auditReport ? JSON.stringify(r.auditReport.findings) : null,
    r.auditReport ? JSON.stringify(r.auditReport.evidence) : null,
    r.auditReport?.reason, r.auditReport?.preparation?.model, r.auditReport?.preparation?.status, r.auditReport?.promptProfile?.id, r.auditReport?.promptProfile?.revision,
  ].map(csvCell).join(','))
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return new Response([header, ...lines].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="presencezero-${safeId}.csv"`,
    },
  })
}
