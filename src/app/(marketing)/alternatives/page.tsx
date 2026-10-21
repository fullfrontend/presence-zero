import type { Metadata } from 'next'
import { ScaleToFit } from '@/components/guides/scale-to-fit'
import Link from 'next/link'
import { Breadcrumbs, FaqList, GuideCta } from '@/components/guides/parts'
import { BreadcrumbJsonLd } from '@/components/guides/structured-data'
import { MapScanArt } from '@/components/guides/illustrations'
import { absoluteUrl, jsonLdString } from '@/lib/site'

const CHECKED = '2026-10-21'
const CHECKED_LABEL = 'October 21, 2026'

export const metadata: Metadata = {
  title: { absolute: 'Best Tools to Find Businesses Without Websites (2026)' },
  description:
    'PresenceZero vs Grape Leads, Webleadr, B2BLeadFinder, Webless Leads, Outscraper and Thyonix: pricing, data sources, dead-site detection and domain checks.',
  alternates: { canonical: '/alternatives' },
  openGraph: { url: '/alternatives', type: 'article', title: 'Tools to find businesses without websites, compared' },
}

type Cell = 'yes' | 'partial' | 'no' | 'unknown'
interface Tool {
  name: string
  url: string
  source: string
  pricing: string
  free: string
  data: string
  deadParked: Cell
  domains: Cell
  selfHost: Cell
  outreach: string
  note: string
}

const TOOLS: Tool[] = [
  {
    name: 'PresenceZero', url: '/', source: 'https://github.com/its-tahir/presence-zero',
    pricing: 'Free, MIT open source', free: 'Everything; you run it',
    data: 'OpenStreetMap, Google Places (your key), Apify (your account), CSV',
    deadParked: 'yes', domains: 'yes', selfHost: 'yes',
    outreach: 'None, by design. Suggests an opening angle you personalise.',
    note: 'Checks every listed site and records why it is dead or parked, checks matching domains via RDAP, and scores leads 0–100. You need to run it yourself (Node.js, Docker or Vercel).',
  },
  {
    name: 'Grape Leads', url: 'https://grapeleads.com', source: 'https://grapeleads.com/buy-credits/',
    pricing: 'One-time credit packs, from $28 for 50 credits', free: '20 free credits on sign-up',
    data: 'Google Maps and other sources',
    deadParked: 'unknown', domains: 'unknown', selfHost: 'no',
    outreach: 'None seen',
    note: 'A "without websites" filter on Google Maps data, with CSV and webhook export. A search costs 1 credit plus 1 per lead.',
  },
  {
    name: 'Webleadr', url: 'https://webleadr.com', source: 'https://webleadr.com/#pricing',
    pricing: 'One-time credit packs, from $14 for 50 credits', free: 'No free leads stated',
    data: 'Not stated',
    deadParked: 'partial', domains: 'unknown', selfHost: 'no',
    outreach: 'AI-written messages and call scripts',
    note: 'Grades existing sites (A–F health, design score) and flags social-only "websites". Exports CSV, Excel, PDF and JSON.',
  },
  {
    name: 'B2BLeadFinder', url: 'https://b2bleadfinder.io', source: 'https://b2bleadfinder.io/pricing',
    pricing: 'Subscription, from $14.99/month', free: '7-day trial, 25 lead scans',
    data: 'Google Places API',
    deadParked: 'unknown', domains: 'unknown', selfHost: 'no',
    outreach: 'Built-in CRM; email sequences announced as coming soon',
    note: 'A 0–100 "digital health" score from gaps such as no website, no phone or low reviews.',
  },
  {
    name: 'Webless Leads', url: 'https://weblessleads.com', source: 'https://weblessleads.com',
    pricing: 'One-time credit packs', free: 'Free trial with preview access',
    data: 'Not stated (Google Maps links in the app)',
    deadParked: 'unknown', domains: 'unknown', selfHost: 'no',
    outreach: 'Notes, tags and contact tracking',
    note: 'Lead lists of businesses without websites with CSV and Excel export. 1 credit per lead found.',
  },
  {
    name: 'Outscraper', url: 'https://outscraper.com/google-maps-scraper/', source: 'https://outscraper.com/pricing/',
    pricing: 'Pay as you go, $3 per 1,000 places', free: 'First 500 places each month',
    data: 'Google Maps',
    deadParked: 'unknown', domains: 'unknown', selfHost: 'no',
    outreach: 'None; offers email enrichment',
    note: 'A general Google Maps scraper with an "only without website" filter (listed on higher tiers). Exports CSV, Excel, JSON and Parquet.',
  },
  {
    name: 'Thyonix', url: 'https://thyonix.com/tools/find-businesses-without-websites', source: 'https://thyonix.com/#pricing',
    pricing: 'Subscription, from £9/month', free: 'Onboarding access: 100 leads',
    data: 'Google Maps / Google Places',
    deadParked: 'unknown', domains: 'unknown', selfHost: 'no',
    outreach: 'Email and WhatsApp campaigns with tracking',
    note: 'Finder plus AI demo websites and outreach campaigns in one hosted product.',
  },
]

const CELL: Record<Cell, { label: string; cls: string }> = {
  yes: { label: 'Yes', cls: 'bg-lime' },
  partial: { label: 'Partly', cls: 'bg-lime/40' },
  no: { label: 'No', cls: 'border border-white/30' },
  unknown: { label: 'Not stated', cls: 'bg-white/15' },
}

function Mark({ v }: { v: Cell }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${CELL[v].cls}`} />
      <span className={v === 'yes' ? 'text-text' : 'text-dim'}>{CELL[v].label}</span>
    </span>
  )
}

const FAQS = [
  { q: 'What is the best free tool to find businesses without websites?', a: 'If you are comfortable running a small web app yourself, PresenceZero is free and open source, and also detects dead and parked sites and checks domain availability. If you would rather not install anything, Outscraper’s free monthly places and Grape Leads’ sign-up credits let you try a hosted tool at no cost.' },
  { q: 'Is there an Outscraper alternative for finding businesses without websites?', a: 'Yes. Dedicated finders such as PresenceZero, Grape Leads, Webleadr and Webless Leads focus on the no-website use case instead of general scraping. PresenceZero is the open-source option and can also use Google Maps data through your own Apify account or Google Places key.' },
  { q: 'Why does detecting dead and parked websites matter?', a: 'Many businesses list a website that no longer works or now shows a "domain for sale" page. Tools that only filter on an empty website field miss them, yet they are often the warmest leads because the owner already paid for a site once.' },
]

export default function AlternativesPage() {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Compare tools', path: '/alternatives' }]
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Tools to find businesses without websites',
    url: absoluteUrl('/alternatives'),
    itemListElement: TOOLS.map((t, i) => ({
      '@type': 'ListItem', position: i + 1, name: t.name, url: t.url.startsWith('/') ? absoluteUrl(t.url) : t.url,
    })),
  }
  return (
    <main className="pb-24">
      <BreadcrumbJsonLd crumbs={crumbs} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(itemList) }} />

      <header className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-14 pt-10 lg:grid-cols-[1.15fr_1fr] lg:pt-14">
        <div>
          <Breadcrumbs crumbs={crumbs} />
          <h1 className="mt-6 text-balance text-[clamp(2.1rem,4.4vw,3.4rem)] font-semibold leading-[1.05] tracking-tight">
            Tools to find businesses without websites, compared
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-dim">
            Seven ways to build a list of local businesses that need a website: what each one costs, where its data
            comes from, and whether it can tell a dead or parked site from a working one.
          </p>
          <p className="mt-6 text-sm text-mute">
            Checked against each vendor&rsquo;s own website on <time dateTime={CHECKED}>{CHECKED_LABEL}</time>. Prices
            change, so follow the source links before you buy.
          </p>
        </div>
        <ScaleToFit><MapScanArt /></ScaleToFit>
      </header>

      <section aria-labelledby="matrix" className="mx-auto max-w-6xl px-6">
        <h2 id="matrix" className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">At a glance</h2>
        <div className="mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <caption className="sr-only">Comparison of tools to find businesses without websites</caption>
            <thead>
              <tr className="border-b border-line text-text">
                <th scope="col" className="px-4 py-3 font-medium">Tool</th>
                <th scope="col" className="px-4 py-3 font-medium">Price</th>
                <th scope="col" className="px-4 py-3 font-medium">Free option</th>
                <th scope="col" className="px-4 py-3 font-medium">Detects dead or parked sites</th>
                <th scope="col" className="px-4 py-3 font-medium">Checks domain availability</th>
                <th scope="col" className="px-4 py-3 font-medium">Self-hosted, open source</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((t, i) => (
                <tr key={t.name} className={`border-b border-line last:border-0 ${i === 0 ? 'bg-lime/5' : ''}`}>
                  <th scope="row" className="px-4 py-3.5 font-medium text-text">{t.name}</th>
                  <td className="px-4 py-3.5 text-dim">{t.pricing}</td>
                  <td className="px-4 py-3.5 text-dim">{t.free}</td>
                  <td className="px-4 py-3.5"><Mark v={t.deadParked} /></td>
                  <td className="px-4 py-3.5"><Mark v={t.domains} /></td>
                  <td className="px-4 py-3.5"><Mark v={t.selfHost} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-mute">
          &ldquo;Not stated&rdquo; means we couldn&rsquo;t find the feature on the vendor&rsquo;s site. It may exist.
        </p>
      </section>

      <section aria-labelledby="each" className="mx-auto mt-20 max-w-6xl px-6">
        <h2 id="each" className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">Each tool in a paragraph</h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {TOOLS.map((t, i) => (
            <li key={t.name} className={`rounded-xl border p-6 ${i === 0 ? 'border-lime/40 bg-lime/5 md:col-span-2' : 'border-line'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold text-text">{t.name}</h3>
                {i === 0
                  ? <Link href="/demo" className="text-sm text-lime underline-offset-4 hover:underline">Try the demo</Link>
                  : <a href={t.source} rel="nofollow noopener" className="text-sm text-mute underline-offset-4 hover:text-dim hover:underline">Source</a>}
              </div>
              <p className="mt-2 leading-relaxed text-dim">{t.note}</p>
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div><dt className="text-mute">Data</dt><dd className="text-text">{t.data}</dd></div>
                <div><dt className="text-mute">Outreach features</dt><dd className="text-text">{t.outreach}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="choose" className="mx-auto mt-20 max-w-6xl px-6">
        <h2 id="choose" className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">Which one should you pick?</h2>
        <div className="pz-prose mt-5">
          <p>
            <strong>Pick PresenceZero</strong> if you want it free, want your lead list to stay on your own machine, and
            care about the leads that empty-field filters miss: businesses whose listed site is dead or parked. It
            also tells you whether the matching domain is free before you pitch. The trade-off is setup: you run it
            yourself, and its best data sources (Google Places, Apify) use your own account.
          </p>
          <p>
            <strong>Pick a hosted tool</strong> if you want zero setup, or features PresenceZero deliberately
            leaves out. Webleadr grades the design of existing sites, B2BLeadFinder builds in a CRM, and Thyonix
            sends outreach campaigns for you. If you only need raw Google Maps data in bulk, Outscraper is the
            general-purpose option.
          </p>
          <p>
            Whatever you use, verify leads before contacting them and keep outreach personal. Our guide on{' '}
            <Link href="/guides/how-to-find-businesses-without-websites">how to find businesses without websites</Link>{' '}
            covers the free manual methods too.
          </p>
        </div>
      </section>

      <section aria-labelledby="faq" className="mx-auto mt-20 max-w-3xl px-6">
        <h2 id="faq" className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">Frequently asked questions</h2>
        <div className="mt-6"><FaqList items={FAQS} /></div>
      </section>

      <div className="mx-auto mt-20 max-w-6xl px-6"><GuideCta /></div>
    </main>
  )
}
