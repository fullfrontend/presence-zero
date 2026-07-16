import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

const AUDIENCES = [
  {
    kicker: '// FREELANCERS',
    title: 'Freelance web developers',
    body: 'Skip the cold-search grind — build a warm list of web design leads, scored by city, in the time it takes to drink your coffee.',
  },
  {
    kicker: '// AGENCIES',
    title: 'Design, marketing & SEO agencies',
    body: 'Feed local SEO prospecting straight into your pipeline — deduped, scored, and exportable before anyone touches a spreadsheet.',
  },
  {
    kicker: '// INVESTORS',
    title: 'Domain investors',
    body: 'Surface available domains sitting next to real, active local businesses — demand signal a bulk whois scrape can’t give you.',
  },
] as const

export function WhoFor() {
  return (
    <section id="who" className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <SectionTag>{'// WHO IT’S FOR'}</SectionTag>
      <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
        Built for people who sell websites and domains.
      </h2>
      <HeadlineRule />
      <div className="mt-14 grid gap-5 sm:grid-cols-3">
        {AUDIENCES.map((a) => (
          <div key={a.title} className="rounded-xl border border-line bg-surface p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">{a.kicker}</p>
            <h3 className="mt-3 text-lg font-medium text-text">{a.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-dim">{a.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
