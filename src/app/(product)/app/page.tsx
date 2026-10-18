import { desc, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { businesses, scans } from '@/db/schema'
import NewScanForm from '@/components/app/new-scan-form'
import PastScans from '@/components/app/past-scans'
import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

export const dynamic = 'force-dynamic'

export default async function AppHome() {
  const defaultLocation = process.env.PRESENCEZERO_DEFAULT_LOCATION?.trim() ?? 'Charleroi, Belgique'
  const configuredCountry = process.env.PRESENCEZERO_DEFAULT_COUNTRY_CODE?.trim().toLowerCase()
  const defaultCountryCode = configuredCountry && /^[a-z]{2}$/.test(configuredCountry) ? configuredCountry : 'be'
  const db = await getDb()
  const rows = await db.select().from(scans).orderBy(desc(scans.createdAt))
  const counts = await db.select({ scanId: businesses.scanId, leads: sql<number>`count(*)` })
    .from(businesses)
    .where(inArray(businesses.presenceStatus, ['none', 'dead', 'parked']))
    .groupBy(businesses.scanId)
  const leadCounts = new Map(counts.map(c => [c.scanId, Number(c.leads)]))
  const scanRows = rows.map(s => ({
    id: s.id,
    createdAt: s.createdAt.getTime(),
    location: s.location,
    category: s.category,
    countryCode: s.countryCode,
    provider: s.provider,
    providerConfig: s.providerConfig,
    status: s.status,
    totalFound: s.totalFound,
    pinned: s.pinned,
    archived: s.archived,
    label: s.label,
    title: s.title,
    leadCount: leadCounts.get(s.id) ?? 0,
  }))
  return (
    <div className="space-y-12">
      <section>
        <SectionTag>{'// NEW SCAN'}</SectionTag>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Find businesses whose web presence is <span className="text-lime">zero</span>.</h1>
        <HeadlineRule />
        <div className="mt-8"><NewScanForm defaultLocation={defaultLocation} defaultCountryCode={defaultCountryCode} /></div>
      </section>
      <section>
        <SectionTag>{'// PAST SCANS'}</SectionTag>
        <div className="mt-4"><PastScans scans={scanRows} /></div>
      </section>
    </div>
  )
}
