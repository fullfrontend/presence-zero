import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

const DESCRIPTION =
  'Open-source, self-hosted lead finder. Turn a city + category into a scored, exportable list of local businesses with no website — and the matching domains you can pitch them.'

export const metadata: Metadata = {
  metadataBase: new URL('https://presencezero.its-tahir.com'),
  title: { default: 'PresenceZero — Find businesses whose web presence is zero', template: '%s · PresenceZero' },
  description: DESCRIPTION,
  applicationName: 'PresenceZero',
  authors: [{ name: 'Tahir Nazir', url: 'https://its-tahir.com' }],
  creator: 'Tahir Nazir',
  publisher: 'Tahir Nazir',
  keywords: [
    'find businesses without websites', 'local business lead generation', 'web design leads',
    'domain availability checker', 'available domain finder', 'leads for web designers',
    'local SEO prospecting', 'self-hosted lead finder', 'Google Places scraper alternative',
    'OpenStreetMap business scraper',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: 'website',
    siteName: 'PresenceZero',
    url: 'https://presencezero.its-tahir.com',
    title: 'PresenceZero — Find businesses whose web presence is zero',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PresenceZero — Find businesses whose web presence is zero',
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
