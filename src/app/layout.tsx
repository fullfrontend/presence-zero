import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { AUTHOR, SITE_NAME, SITE_URL } from '@/lib/site'

const DESCRIPTION =
  'Free, open-source lead finder: find local businesses with no website, a dead site or a parked domain, check matching domains, and export scored leads.'
const HOME_TITLE = 'Find Businesses Without Websites (Free) | PresenceZero'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: '%s | PresenceZero' },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: 'technology',
  keywords: [
    'find businesses without websites', 'businesses without websites finder', 'local businesses without websites',
    'web design leads', 'leads for web designers', 'how to get web design clients',
    'no website leads', 'dead website checker', 'parked domain checker',
    'domain availability checker', 'RDAP lookup', 'open source lead generation tool',
    'self-hosted lead finder', 'Google Maps leads', 'OpenStreetMap business data',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { types: { 'application/rss+xml': [{ url: '/guides/rss.xml', title: 'PresenceZero guides' }] } },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: SITE_URL,
    title: HOME_TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: DESCRIPTION,
  },
}

export const viewport: Viewport = { themeColor: '#0A0A0B', colorScheme: 'dark' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-base text-text antialiased">
        <noscript><style>{`.pz-reveal{opacity:1!important;transform:none!important}`}</style></noscript>
        <div className="pz-texture" aria-hidden="true"><div className="pz-grid" /><div className="pz-grain" /></div>
        {children}
      </body>
    </html>
  )
}
