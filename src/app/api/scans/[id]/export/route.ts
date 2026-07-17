import { desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { businesses, domainCandidates } from '@/db/schema'

function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v)
  // Neutralize spreadsheet formula injection: a leading =, +, -, @, tab or CR
  // can execute as a formula in Excel/Sheets. Prefix with a single quote.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = await getDb()
  const rows = await db.select().from(businesses).where(eq(businesses.scanId, id)).orderBy(desc(businesses.score))
  const ids = rows.map(r => r.id)
  const candidates = ids.length
    ? await db.select().from(domainCandidates).where(inArray(domainCandidates.businessId, ids))
    : []
  const available = new Map<string, string[]>()
  for (const c of candidates) {
    if (c.available === true) available.set(c.businessId, [...(available.get(c.businessId) ?? []), c.domain])
  }
  const header = 'name,address,phone,category,rating,review_count,website,presence,probe_detail,score,lead_status,note,available_domains'
  const lines = rows.map(r => [
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
