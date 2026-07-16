import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

const FEATURES = [
  {
    kicker: '// SOURCES',
    title: 'Google Places, OpenStreetMap, or CSV',
    body: 'Pull business data from live providers or import your own list — no vendor lock-in.',
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
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <SectionTag>{'// FEATURES'}</SectionTag>
      <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
        Everything a lead finder for web designers and agencies needs.
      </h2>
      <HeadlineRule />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-surface p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">{f.kicker}</p>
            <h3 className="mt-3 text-lg font-medium text-text">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-dim">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
