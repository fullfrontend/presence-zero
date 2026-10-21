import { FAQ_ITEMS } from '@/components/landing/faq-data'
import { AUTHOR_LD, REPO_URL, SITE_NAME, SITE_URL, absoluteUrl, jsonLdString } from '@/lib/site'

export function JsonLd() {
  const author = { '@id': AUTHOR_LD['@id'] }
  const graph = [
    AUTHOR_LD,
    {
      '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, inLanguage: 'en',
      publisher: author,
    },
    {
      '@type': 'SoftwareApplication', '@id': `${SITE_URL}/#software`, name: SITE_NAME,
      alternateName: 'PresenceZero lead finder',
      applicationCategory: 'BusinessApplication', applicationSubCategory: 'Lead generation',
      operatingSystem: 'Web, Docker, Node.js',
      description:
        'Free, open-source, self-hosted lead finder that finds local businesses with no website, a dead website or a parked domain, checks which matching domains are available via RDAP, and scores each lead from 0 to 100.',
      url: SITE_URL,
      screenshot: absoluteUrl('/screenshots/demo-lead-detail.png'),
      featureList: [
        'Find local businesses by location and category',
        'Detect no, dead and parked websites with a recorded reason',
        'Check matching domain availability via RDAP',
        '0–100 lead score with a per-factor breakdown',
        'OpenStreetMap, Google Places, Apify and CSV data sources',
        'CSV and JSON export',
      ],
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author, publisher: author,
      sameAs: [REPO_URL],
    },
    {
      '@type': 'SoftwareSourceCode', name: SITE_NAME, codeRepository: REPO_URL,
      programmingLanguage: 'TypeScript', runtimePlatform: 'Node.js',
      license: 'https://opensource.org/licenses/MIT', author,
      targetProduct: { '@id': `${SITE_URL}/#software` },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString({ '@context': 'https://schema.org', '@graph': graph }) }} />
}
