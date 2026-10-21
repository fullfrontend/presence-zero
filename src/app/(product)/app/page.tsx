import { loadRuntimeSettings } from '@/server/runtime-settings'
import { getI18n } from '@/i18n/server'
import { desc, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { businesses, scans } from '@/db/schema'
import NewScanForm from '@/components/app/new-scan-form'
import PastScans from '@/components/app/past-scans'
import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

export const dynamic = 'force-dynamic'

export default async function AppHome() {
  const { t } = await getI18n()
  const db = await getDb()
  const { env } = await loadRuntimeSettings(db)
  const defaultLocation = env.PRESENCEZERO_DEFAULT_LOCATION?.trim() ?? t("Charleroi, Belgique")
  const configuredCountry = env.PRESENCEZERO_DEFAULT_COUNTRY_CODE?.trim().toLowerCase()
  const defaultCountryCode = configuredCountry && /^[a-z]{2}$/.test(configuredCountry) ? configuredCountry : 'be'
  const hasGoogleKey = !!env.GOOGLE_PLACES_API_KEY?.trim()
  const rows = await db.select().from(scans).orderBy(desc(scans.createdAt))
  const counts = await db.select({ scanId: businesses.scanId, leads: sql<number>`count(*)` })
    .from(businesses)
    .where(inArray(businesses.presenceStatus, ['not_found', 'none', 'dead', 'parked', 'configuration_error', 'facebook']))
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
        <SectionTag>{t("// NEW SCAN")}</SectionTag>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("New scan")}</h1>
        <HeadlineRule />
        <div className="mt-8"><NewScanForm hasInitialGoogleKey={hasGoogleKey} defaultLocation={defaultLocation} defaultCountryCode={defaultCountryCode} /></div>
      </section>
      <section>
        <SectionTag>{t("// PAST SCANS")}</SectionTag>
        <div className="mt-4"><PastScans scans={scanRows} /></div>
      </section>
    </div>
  )
}
