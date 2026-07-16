import { FAQ_ITEMS } from '@/components/landing/faq-data'
export function JsonLd() {
  const graph = [
    {
      '@type': 'SoftwareApplication', name: 'PresenceZero',
      applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Docker, Node.js',
      description: 'Open-source, self-hosted lead finder that spots local businesses with no website and checks which matching domains are available.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: 'Tahir Nazir', url: 'https://its-tahir.com' },
      url: 'https://presencezero.its-tahir.com',
      applicationSuite: 'its-tahir.com',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') }} />
}
