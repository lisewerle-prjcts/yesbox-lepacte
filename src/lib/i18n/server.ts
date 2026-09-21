import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, t, type Locale } from './locale'

export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/** Variante serveur de `useT()` : `const t = getT(await getLocale())`. */
export function getT(locale: Locale) {
  return (fr: string, en: string) => t(locale, fr, en)
}
