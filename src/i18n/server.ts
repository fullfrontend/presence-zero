import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE, resolveLocale } from './config'
import { createTranslator } from './translate'
export async function getI18n() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, requestHeaders.get('accept-language') ?? undefined, process.env.PRESENCEZERO_DEFAULT_LOCALE)
  return { locale, t: createTranslator(locale) }
}
