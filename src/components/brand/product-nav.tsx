'use client'
import { useI18n } from '@/i18n/client'
import { LanguageSelector } from './language-selector'
import { Logo } from './logo'
export function ProductNav() {
  const { t } = useI18n()
  return (
    <header className="border-b border-line">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 sm:gap-6 px-6 py-4 text-sm text-dim">
        <Logo />
        <a href="/app" className="hover:text-text">{t("New scan")}</a>
        <a href="/app/settings" className="hover:text-text">{t("Settings")}</a>
        <a href="/demo" className="ml-auto hover:text-text">{t("View demo")}</a>
        <a href="https://github.com/its-tahir/presence-zero" className="hover:text-text">{t("GitHub ★")}</a>
      <LanguageSelector />
      </nav>
    </header>
  )
}
