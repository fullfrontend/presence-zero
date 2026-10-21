import type { Metadata } from 'next'
import { ScaleToFit } from '@/components/guides/scale-to-fit'
import Link from 'next/link'
import { GUIDES, guidePath } from '@/content/guides'
import { GuideArt, GuideThumb } from '@/components/guides/illustrations'
import { GuidesHubJsonLd } from '@/components/guides/structured-data'
import { Breadcrumbs, GuideCta } from '@/components/guides/parts'

export const metadata: Metadata = {
  title: { absolute: 'Guides: Find & Win Local Web Design Clients | PresenceZero' },
  description:
    'Free, practical guides for web designers and agencies: find businesses without websites, check domains with RDAP, spot dead and parked sites, and win clients.',
  alternates: { canonical: '/guides', types: { 'application/rss+xml': '/guides/rss.xml' } },
  openGraph: { url: '/guides', title: 'PresenceZero guides', type: 'website' },
}

export default function GuidesHub() {
  const [featured, ...rest] = GUIDES
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-10 lg:pt-14">
      <GuidesHubJsonLd />
      <Breadcrumbs crumbs={[{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }]} />
      <h1 className="mt-6 max-w-3xl text-balance text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.03] tracking-tight">
        Find local businesses that need a website, and win them as clients.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dim">
        Hands-on playbooks for freelancers and agencies: where the leads are, how to check them, and what to say
        when you call. Every method here works for free.
      </p>

      <Link
        href={guidePath(featured.slug)}
        className="group mt-14 grid items-center gap-8 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-lime/40 sm:p-8 lg:grid-cols-[1fr_1.1fr]"
      >
        <div className="order-2 lg:order-1">
          <p className="text-sm font-medium text-lime">Start here</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight text-text">{featured.title}</h2>
          <p className="mt-4 leading-relaxed text-dim">{featured.description}</p>
          <p className="mt-6 text-sm text-mute">{featured.readMinutes} min read</p>
        </div>
        <div className="order-1 lg:order-2"><ScaleToFit><GuideArt slug={featured.slug} decorative /></ScaleToFit></div>
      </Link>

      <ul className="mt-6 divide-y divide-line">
        {rest.map(g => (
          <li key={g.slug}>
            <Link href={guidePath(g.slug)} className="group grid items-center gap-5 py-7 sm:grid-cols-[260px_1fr] sm:gap-8">
              <div className="transition duration-300 group-hover:-translate-y-0.5"><GuideThumb slug={g.slug} /></div>
              <div>
                <h2 className="text-balance text-xl font-semibold leading-snug tracking-tight text-text transition-colors group-hover:text-lime sm:text-2xl">
                  {g.title}
                </h2>
                <p className="mt-2 max-w-2xl leading-relaxed text-dim">{g.description}</p>
                <p className="mt-3 text-sm text-mute">{g.readMinutes} min read</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-16"><GuideCta /></div>
    </main>
  )
}
