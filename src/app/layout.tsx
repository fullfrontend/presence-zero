import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://presencezero.its-tahir.com'),
  title: { default: 'PresenceZero — Find businesses whose web presence is zero', template: '%s · PresenceZero' },
  description:
    'Open-source, self-hosted lead finder. Turn a city + category into a scored, exportable list of local businesses with no website — and the matching domains you can pitch them.',
  applicationName: 'PresenceZero',
  authors: [{ name: 'Tahir Nazir', url: 'https://its-tahir.com' }],
  creator: 'Tahir Nazir',
  keywords: [
    'find businesses without websites', 'local business lead generation', 'web design leads',
    'domain availability checker', 'available domain finder', 'leads for web designers',
    'local SEO prospecting', 'self-hosted lead finder', 'Google Places scraper alternative',
    'OpenStreetMap business scraper',
  ],
}

export const viewport: Viewport = { themeColor: '#0A0A0B', colorScheme: 'dark' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-base text-text antialiased">
        <div className="pz-texture" aria-hidden="true"><div className="pz-grid" /><div className="pz-grain" /></div>
        {children}
      </body>
    </html>
  )
}
