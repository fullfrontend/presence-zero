import { AUTHOR_LD, SITE_NAME, SITE_URL, absoluteUrl, jsonLdString } from '@/lib/site'
import { GUIDES, guideOgPath, guidePath, type Guide } from '@/content/guides'

export type Crumb = { name: string; path: string }

function breadcrumbLd(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  }
}

function Ld({ graph }: { graph: object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString({ '@context': 'https://schema.org', '@graph': graph }) }}
    />
  )
}

export function GuideJsonLd({ guide }: { guide: Guide }) {
  const url = absoluteUrl(guidePath(guide.slug))
  return (
    <Ld
      graph={[
        {
          '@type': 'Article',
          '@id': `${url}#article`,
          headline: guide.title,
          description: guide.description,
          url,
          mainEntityOfPage: url,
          image: absoluteUrl(guideOgPath(guide.slug)),
          datePublished: guide.published,
          dateModified: guide.updated,
          inLanguage: 'en',
          keywords: guide.keywords.join(', '),
          articleSection: 'Guides',
          author: AUTHOR_LD,
          publisher: AUTHOR_LD,
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
          about: { '@type': 'SoftwareApplication', name: SITE_NAME, url: SITE_URL },
        },
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: guide.shortTitle, path: guidePath(guide.slug) },
        ]),
      ]}
    />
  )
}

export function GuidesHubJsonLd() {
  const url = absoluteUrl('/guides')
  return (
    <Ld
      graph={[
        {
          '@type': 'CollectionPage',
          '@id': `${url}#page`,
          name: 'PresenceZero guides',
          url,
          inLanguage: 'en',
          author: AUTHOR_LD,
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: GUIDES.map((g, i) => ({
              '@type': 'ListItem', position: i + 1, url: absoluteUrl(guidePath(g.slug)), name: g.title,
            })),
          },
        },
        breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }]),
      ]}
    />
  )
}

export function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  return <Ld graph={[breadcrumbLd(crumbs)]} />
}
