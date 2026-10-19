'use client'
import { useI18n } from '@/i18n/client'
import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

const FEATURES = [
  {
    kicker: '// SOURCES',
    title: 'OpenStreetMap, CSV, Google, or Apify',
    body: 'Start free with no key at all — OpenStreetMap or your own CSV. Add Google Places or Apify Google Maps with your own account for wider coverage. No vendor lock-in, and never a per-lead fee.',
  },
  {
    kicker: '// PRESENCE',
    title: 'None, dead, parked, or alive',
    body: 'Web presence is classified automatically, so you know at a glance who needs a website.',
  },
  {
    kicker: '// DOMAINS',
    title: 'Domain availability checker',
    body: 'RDAP lookups confirm whether the matching domain is free to register — no API key required.',
  },
  {
    kicker: '// SCORING',
    title: '0–100 lead score',
    body: 'Presence, domain status, and business signals roll up into one score you can sort and filter by.',
  },
  {
    kicker: '// PIPELINE',
    title: 'A pipeline, not a spreadsheet',
    body: 'Move leads through stages as you work the list, from new through contacted to won.',
  },
  {
    kicker: '// EXPORT',
    title: 'CSV export, any time',
    body: 'Take your list anywhere — your CRM, your outreach tool, or your own spreadsheet.',
  },
  {
    kicker: '// OWNERSHIP',
    title: 'Free tier, or self-hosted lead finder',
    body: 'Run it hosted on the free tier, or self-host the open-source project and bring your own keys.',
  },
] as const

export function Features() {
  const { t } = useI18n()
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <SectionTag>{t("// FEATURES")}</SectionTag>
      <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
        {t("Everything a lead finder for web designers and agencies needs.")}</h2>
      <HeadlineRule />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-surface p-6 transition duration-200 hover:-translate-y-0.5 hover:border-lime/40">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">{t(f.kicker)}</p>
            <h3 className="mt-3 text-lg font-medium text-text">{t(f.title)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-dim">{t(f.body)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
