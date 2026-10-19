import { getI18n } from '@/i18n/server'
import { FAQ_ITEMS } from '@/components/landing/faq-data'
export async function JsonLd() {
  const { t, locale } = await getI18n()
  const publisher = { '@type': 'Person', name: 'Tahir Nazir', url: 'https://its-tahir.com' }
  const graph = [
    {
      '@type': 'SoftwareApplication', name: 'PresenceZero',
      applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Docker, Node.js',
      inLanguage: locale,
      description: t('Open-source, self-hosted lead finder that spots local businesses with no website and checks which matching domains are available.'),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: 'Tahir Nazir', url: 'https://its-tahir.com' },
      publisher,
      url: 'https://presencezero.its-tahir.com',
      applicationSuite: 'its-tahir.com',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map(f => ({ '@type': 'Question', name: t(f.q), acceptedAnswer: { '@type': 'Answer', text: t(f.a) } })),
    },
    {
      '@type': 'WebSite', name: 'PresenceZero', url: 'https://presencezero.its-tahir.com',
      publisher,
    },
  ]
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') }} />
}
