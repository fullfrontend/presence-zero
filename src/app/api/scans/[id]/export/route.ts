import { desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { businesses, domainCandidates } from '@/db/schema'
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
  const { minScore, leadsOnly, hasPhone, leadStatus } = parsed.data

  const db = await getDb()
  const rows = await db.select().from(businesses).where(eq(businesses.scanId, id)).orderBy(desc(businesses.score))
  const filtered = rows.filter(r => matchesResultFilters(r, {
    minScore,
    leadsOnly: leadsOnly || false,
    hasPhoneOnly: hasPhone || false,
    leadStatus: leadStatus ?? '',
  }))
  const ids = filtered.map(r => r.id)
  const candidates = ids.length
    ? await db.select().from(domainCandidates).where(inArray(domainCandidates.businessId, ids))
    : []
  const available = new Map<string, string[]>()
  for (const c of candidates) {
    if (c.available === true) available.set(c.businessId, [...(available.get(c.businessId) ?? []), c.domain])
  }
  const header = 'name,address,phone,category,rating,review_count,website,presence,probe_detail,score,lead_status,note,available_domains'
  const lines = filtered.map(r => [
    r.name, r.address, r.phone, r.category, r.rating, r.reviewCount, r.listedWebsite,
    r.presenceStatus, r.probeDetail, r.score, r.leadStatus, r.note, (available.get(r.id) ?? []).join(' '),
  ].map(csvCell).join(','))
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return new Response([header, ...lines].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="presencezero-${safeId}.csv"`,
    },
  })
}
