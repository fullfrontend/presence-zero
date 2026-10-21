import { getI18n } from '@/i18n/server'
import { LocaleProvider } from '@/i18n/client'
import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return {
    title: { default: 'PresenceZero', template: '%s · PresenceZero' },
    description: t('Local business prospecting application.'),
    applicationName: 'PresenceZero',
    robots: { index: false, follow: false },
    formatDetection: { telephone: false, email: false, address: false },
  }
}

export const viewport: Viewport = { themeColor: '#0A0A0B', colorScheme: 'dark' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n()
  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-base text-text antialiased">
        <div className="pz-texture" aria-hidden="true"><div className="pz-grid" /><div className="pz-grain" /></div>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  )
}
