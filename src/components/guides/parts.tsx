import Link from 'next/link'
import { Button } from '@/components/brand/button'
import { AUTHOR, REPO_URL } from '@/lib/site'
import type { Crumb } from './structured-data'
import type { GuideFaq } from '@/content/guides'

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-mute">
        {crumbs.map((c, i) => (
          <li key={c.path} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-white/20">/</span>}
            {i === crumbs.length - 1
              ? <span aria-current="page" className="text-dim">{c.name}</span>
              : <Link href={c.path} className="hover:text-text">{c.name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function FaqList({ items }: { items: GuideFaq[] }) {
  return (
    <div className="divide-y divide-line rounded-xl border border-line">
      {items.map(f => (
        <details key={f.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex items-center justify-between gap-4 py-4 text-left font-medium text-text">
            {f.q}
            <span aria-hidden="true" className="relative h-3 w-3 shrink-0">
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-lime" />
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-lime transition-transform duration-200 group-open:scale-y-0" />
            </span>
          </summary>
          <p className="pb-5 pr-6 text-[15px] leading-relaxed text-dim">{f.a}</p>
        </details>
      ))}
    </div>
  )
}

export function AuthorBox() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-line bg-surface p-5">
      <div aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-lime/40 font-semibold text-text">
        TN<span className="text-lime">.</span>
      </div>
      <div>
        <p className="text-sm text-text">
          Written by <a href={AUTHOR.url} rel="author" className="font-medium underline-offset-4 hover:underline">{AUTHOR.name}</a>
        </p>
        <p className="mt-1 text-sm leading-relaxed text-dim">
          Tahir builds websites and AI call receptionists for local businesses, and wrote PresenceZero to find his own
          leads. These guides are the playbook he uses with it.
        </p>
      </div>
    </div>
  )
}

export function GuideCta() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-lime/30 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(198,242,78,0.12),transparent_55%)] p-8 sm:p-10">
      <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight">Run this on your own city.</h2>
      <p className="mt-3 max-w-xl text-dim">
        PresenceZero is free and open source. Start with OpenStreetMap: no API key, no account, a scored list in
        minutes. Or click through a real result set first.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/demo">Explore the live demo</Button>
        <Button href={REPO_URL} variant="ghost">Self-host from GitHub</Button>
      </div>
    </section>
  )
}
