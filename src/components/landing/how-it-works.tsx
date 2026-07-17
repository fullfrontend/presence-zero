import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

const STEPS = [
  {
    n: '01',
    title: 'Find',
    body: 'Pull businesses from OpenStreetMap or your own CSV with no key at all, or add Google Places or Apify’s Google Maps scraper for wider coverage — pick a city and category and get a raw list in seconds.',
  },
  {
    n: '02',
    title: 'Probe',
    body: "Every result's web presence gets classified automatically: none, dead, parked, or alive.",
  },
  {
    n: '03',
    title: 'Check domains',
    body: 'An RDAP lookup checks whether the matching domain is available — no API key, no whois scraping.',
  },
  {
    n: '04',
    title: 'Score',
    body: 'Presence, domain status, and business signals roll up into a single 0–100 lead score.',
  },
  {
    n: '05',
    title: 'Work the list',
    body: 'Move leads through a pipeline as you go, then export the whole thing to CSV when you’re ready to reach out.',
  },
] as const

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <SectionTag>{'// HOW IT WORKS'}</SectionTag>
      <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
        Local business lead generation, from search to CSV.
      </h2>
      <HeadlineRule />
      <ol className="mt-14 grid gap-10 lg:grid-cols-5 lg:gap-6">
        {STEPS.map((step) => (
          <li key={step.n} className="lg:border-l lg:border-line lg:pl-6">
            <div className="font-mono text-sm text-lime">{step.n}</div>
            <div className="mt-3 text-lg font-medium text-text">{step.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-dim">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
