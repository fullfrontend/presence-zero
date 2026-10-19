import { getI18n } from '@/i18n/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DEMO_SCAN } from '@/lib/demo-data'
import ResultsTable from '@/components/app/results-table'
import { SectionTag } from '@/components/brand/section-tag'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return {
  title: t('Live demo'),
  description: t('Explore a real PresenceZero result set — scored local-business leads with available domains. Read-only; self-host to run your own scans.'),
  alternates: { canonical: '/demo' },
  }
}

export default async function DemoPage() {
  const { t } = await getI18n()
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <SectionTag>{t("// LIVE DEMO — READ ONLY")}</SectionTag>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t(DEMO_SCAN.category)} <span className="text-mute">{t("in")}</span> {DEMO_SCAN.location}</h1>
      <p className="mt-3 max-w-2xl text-sm text-dim">
        {t("Expand any row for a score breakdown and a ready-to-personalize outreach angle. Filtering and sorting work; scanning and editing are disabled.")}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href="https://github.com/its-tahir/presence-zero"
          className="inline-flex items-center gap-2 rounded-md bg-lime px-5 py-2.5 text-sm font-medium text-base transition hover:brightness-105"
        >
          {t("Self-host in 2 minutes")}</a>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 text-sm text-text transition hover:border-lime/60"
        >
          {t("Back to landing")}</Link>
        <span className="text-sm text-mute">
          {t("White-label?")}{' '}
          <a href="mailto:hello@its-tahir.com" className="text-lime underline-offset-4 hover:underline">
            {t("Get in touch")}</a>
        </span>
      </div>
      <div className="mt-8"><ResultsTable scanId="demo" readOnly initialResults={DEMO_SCAN.results} autoTour location={DEMO_SCAN.location} /></div>
    </main>
  )
}
