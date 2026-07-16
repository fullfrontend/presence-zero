import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

const MANUAL = [
  'Slow — one search, one map, one tab at a time. A single city can eat an evening.',
  'Unscored — every pin looks the same until you click through and judge it yourself.',
  'No domain signal — you won’t know if the matching domain is taken until you check it by hand.',
  'Easy to lose track — no pipeline, so promising leads die in browser tabs and half-finished spreadsheets.',
]

const PRESENCEZERO = [
  'Scored — every lead ranked 0–100 the moment it’s found.',
  'Deduped — no repeat businesses across providers or repeat searches.',
  'Domain-aware — RDAP availability checked automatically, for every lead, every time.',
  'Exportable — pipeline stages and CSV export built in, ready for your outreach list.',
]

export function WhyManual() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <SectionTag>{'// WHY NOT JUST SCROLL THE MAP'}</SectionTag>
      <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
        Manual local SEO prospecting doesn’t scale.
      </h2>
      <HeadlineRule />
      <p className="mt-6 max-w-2xl text-lg text-dim">
        Whether you’re sourcing web design leads for yourself or running local SEO prospecting for a
        client, hunting Google Maps by hand costs hours and leaves signal on the table.
      </p>
      <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-8">
        <div className="rounded-xl border border-line bg-surface p-6">
          <h3 className="text-sm font-medium text-mute">Hunting Google Maps by hand</h3>
          <ul className="mt-5 space-y-4">
            {MANUAL.map((line) => (
              <li key={line} className="text-sm leading-relaxed text-dim">{line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-lime/30 bg-lime/[0.04] p-6">
          <h3 className="text-sm font-medium text-lime">PresenceZero</h3>
          <ul className="mt-5 space-y-4">
            {PRESENCEZERO.map((line) => (
              <li key={line} className="text-sm leading-relaxed text-dim">{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
