import Link from 'next/link'
import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'
import { GUIDES, guidePath } from '@/content/guides'
import { GuideThumb } from '@/components/guides/illustrations'

export function GuidesTeaser() {
  const picks = GUIDES.slice(0, 3)
  return (
    <section id="guides" className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <SectionTag>{'// GUIDES'}</SectionTag>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <h2 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          The playbook behind the tool.
        </h2>
        <Link href="/guides" className="text-sm text-dim underline-offset-4 hover:text-text hover:underline">All guides</Link>
      </div>
      <HeadlineRule />
      <ul className="mt-14 grid gap-8 md:grid-cols-3">
        {picks.map(g => (
          <li key={g.slug}>
            <Link href={guidePath(g.slug)} className="group block">
              <div className="transition duration-300 group-hover:-translate-y-1"><GuideThumb slug={g.slug} /></div>
              <h3 className="mt-5 text-lg font-medium leading-snug text-text group-hover:text-lime">{g.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-dim">{g.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
