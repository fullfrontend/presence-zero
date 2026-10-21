import type { Metadata } from 'next'
import { ScaleToFit } from '@/components/guides/scale-to-fit'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GUIDES, getGuide, guideOgPath, guidePath } from '@/content/guides'
import { GuideArt, GuideThumb } from '@/components/guides/illustrations'
import { GuideJsonLd } from '@/components/guides/structured-data'
import { AuthorBox, Breadcrumbs, FaqList, GuideCta, formatDate } from '@/components/guides/parts'
import { GuideToc, ReadingProgress } from '@/components/guides/reading-aids'
import { AUTHOR } from '@/lib/site'

type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false
export function generateStaticParams() {
  return GUIDES.map(g => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const guide = getGuide((await params).slug)
  if (!guide) return {}
  const path = guidePath(guide.slug)
  return {
    title: { absolute: guide.seoTitle },
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: path },
    authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
    openGraph: {
      type: 'article',
      url: path,
      title: guide.seoTitle,
      description: guide.description,
      publishedTime: guide.published,
      modifiedTime: guide.updated,
      authors: [AUTHOR.url],
      section: 'Guides',
      tags: guide.keywords,
      images: [{ url: guideOgPath(guide.slug), width: 1200, height: 630, alt: guide.title }],
    },
    twitter: { card: 'summary_large_image', title: guide.seoTitle, description: guide.description, images: [guideOgPath(guide.slug)] },
  }
}

export default async function GuidePage({ params }: Params) {
  const guide = getGuide((await params).slug)
  if (!guide) notFound()
  const toc = [
    ...guide.sections.map(s => ({ id: s.id, label: s.heading })),
    { id: 'faq', label: 'Frequently asked questions' },
  ]
  const related = guide.related.map(getGuide).filter(g => g !== undefined)
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Guides', path: '/guides' },
    { name: guide.shortTitle, path: guidePath(guide.slug) },
  ]

  return (
    <>
      <ReadingProgress targetId="guide-body" />
      <GuideJsonLd guide={guide} />
      <article>
        <header className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-14 pt-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:pt-14">
          <div>
            <Breadcrumbs crumbs={crumbs} />
            <h1 className="mt-6 text-balance text-[clamp(2.1rem,4.4vw,3.4rem)] font-semibold leading-[1.05] tracking-tight">
              {guide.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-dim">{guide.description}</p>
            <dl className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex gap-1.5"><dt className="text-mute">By</dt><dd><a href={AUTHOR.url} rel="author" className="text-text underline-offset-4 hover:underline">{AUTHOR.name}</a></dd></div>
              <div className="flex gap-1.5"><dt className="text-mute">Updated</dt><dd className="text-text"><time dateTime={guide.updated}>{formatDate(guide.updated)}</time></dd></div>
              <div className="flex gap-1.5"><dt className="text-mute">Reading time</dt><dd className="text-text">{guide.readMinutes} min</dd></div>
            </dl>
          </div>
          <ScaleToFit><GuideArt slug={guide.slug} /></ScaleToFit>
        </header>

        <div id="guide-body" className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24"><GuideToc items={toc} /></div>
          </aside>

          <div className="min-w-0">
            <details className="mb-8 rounded-xl border border-line px-5 py-3 lg:hidden">
              <summary className="text-sm font-medium text-text">On this page</summary>
              <ol className="mt-3 space-y-2 pb-2 text-sm">
                {toc.map(t => <li key={t.id}><a href={`#${t.id}`} className="text-dim hover:text-text">{t.label}</a></li>)}
              </ol>
            </details>

            <section aria-label="The short answer" className="max-w-[68ch] rounded-xl border-l-2 border-lime bg-lime/5 px-6 py-5">
              <p className="text-sm font-medium text-lime">The short answer</p>
              <p className="mt-2 text-[1.0625rem] leading-relaxed text-text">{guide.tldr}</p>
            </section>

            {guide.sections.map(s => (
              <section key={s.id} aria-labelledby={s.id} className="mt-16">
                <h2 id={s.id} className="max-w-[30ch] text-balance text-2xl font-semibold leading-tight tracking-tight text-text sm:text-[1.7rem]">
                  {s.heading}
                </h2>
                <div className="pz-prose mt-5">{s.content}</div>
              </section>
            ))}

            <section aria-labelledby="faq" className="mt-20 max-w-[68ch]">
              <h2 id="faq" className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">Frequently asked questions</h2>
              <div className="mt-6"><FaqList items={guide.faqs} /></div>
            </section>

            <div className="mt-14 max-w-[68ch]"><AuthorBox /></div>
          </div>
        </div>
      </article>

      <aside aria-labelledby="related" className="mx-auto max-w-6xl px-6 pb-16">
        <h2 id="related" className="text-2xl font-semibold tracking-tight">Keep reading</h2>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {related.map(r => (
            <li key={r.slug}>
              <Link href={guidePath(r.slug)} className="group block">
                <div className="transition duration-300 group-hover:-translate-y-1"><GuideThumb slug={r.slug} /></div>
                <p className="mt-4 font-medium leading-snug text-text group-hover:text-lime">{r.title}</p>
                <p className="mt-1 text-sm text-mute">{r.readMinutes} min read</p>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div className="mx-auto max-w-6xl px-6 pb-24"><GuideCta /></div>
    </>
  )
}
