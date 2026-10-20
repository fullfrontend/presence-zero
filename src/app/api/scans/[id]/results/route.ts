import { and, desc, eq, gte, inArray, isNull, or, lt } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { businesses, domainCandidates, scans, scanJobs } from '@/db/schema'
import { normalizeBusinessKey } from '@/core/dedupe'
import { resultsQuerySchema } from '@/server/validation'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const url = new URL(req.url)
  const parsed = resultsQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { minScore, presence, leadStatus } = parsed.data

  const db = await getDb()
  const conditions = [eq(businesses.scanId, id)]
  if (minScore !== undefined) conditions.push(minScore === 0 ? or(gte(businesses.score, 0), isNull(businesses.score))! : gte(businesses.score, minScore))
  if (presence) conditions.push(eq(businesses.presenceStatus, presence))
  if (leadStatus) conditions.push(eq(businesses.leadStatus, leadStatus))

  const rows = await db.select().from(businesses).where(and(...conditions)).orderBy(desc(businesses.score))
  const jobs = await db.select({ businessId: scanJobs.businessId, kind: scanJobs.kind, status: scanJobs.status, error: scanJobs.error, availableAt: scanJobs.availableAt }).from(scanJobs).where(eq(scanJobs.scanId, id))
  const ids = rows.map(r => r.id)
  const candidates = ids.length
    ? await db.select().from(domainCandidates).where(inArray(domainCandidates.businessId, ids))
    : []
  const byBusiness = new Map<string, Array<{ domain: string; available: boolean | null }>>()
  for (const c of candidates) {
    const list = byBusiness.get(c.businessId) ?? []
    list.push({ domain: c.domain, available: c.available })
    byBusiness.set(c.businessId, list)
  }

  // Flag businesses already seen in an earlier scan of the same location, so the
  // operator doesn't re-pitch a lead they've worked before.
  const scan = (await db.select().from(scans).where(eq(scans.id, id)))[0]
  let seenKeys = new Set<string>()
  if (scan) {
    const earlier = await db
      .select({ name: businesses.name })
      .from(businesses)
      .innerJoin(scans, eq(businesses.scanId, scans.id))
      .where(and(eq(scans.location, scan.location), lt(scans.createdAt, scan.createdAt)))
    seenKeys = new Set(earlier.map(e => normalizeBusinessKey(e.name)))
  }

  return Response.json({
    results: rows.map(r => ({
      ...r,
      enrichment: jobs.filter(job => job.businessId === r.id),
      domains: byBusiness.get(r.id) ?? [],
      seenBefore: seenKeys.has(normalizeBusinessKey(r.name)),
    })),
  })
}
