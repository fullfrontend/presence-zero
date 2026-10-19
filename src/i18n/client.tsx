'use client'
import { createContext, useContext, useMemo } from 'react'
import type { Locale } from './config'
import { createTranslator, formatDate, formatNumber, translateSystem } from './translate'
const LocaleContext = createContext<Locale>('en-US')
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}
export function useI18n() {
  const locale = useContext(LocaleContext)
  return useMemo(() => ({ locale, t: createTranslator(locale), system: (message: string) => translateSystem(locale, message),
    number: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(locale, value, options),
    date: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => formatDate(locale, value, options),
  }), [locale])
}
