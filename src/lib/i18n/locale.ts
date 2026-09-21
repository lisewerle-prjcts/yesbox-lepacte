export type Locale = 'fr' | 'en'

export const LOCALE_COOKIE = 'yb_locale'
export const DEFAULT_LOCALE: Locale = 'fr'

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'fr' || value === 'en'
}

/** Retourne `fr` ou `en` selon la langue active. Utilisable côté serveur comme côté client. */
export function t(locale: Locale, fr: string, en: string): string {
  return locale === 'en' ? en : fr
}
