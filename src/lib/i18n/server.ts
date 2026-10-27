import { cookies, headers } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, t, type Locale } from './locale'

// Langue choisie sur ce navigateur ; sinon celle du navigateur (en-tête
// Accept-Language), pour qu'une personne anglophone n'ait pas à trouver le
// bouton « EN » — sa langue est ensuite mémorisée sur son profil à
// l'inscription, et ses e-mails suivent.
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  if (isLocale(value)) return value
  return langueDuNavigateur((await headers()).get('accept-language'))
}

// « en-US,en;q=0.9,fr;q=0.8 » → en. La première langue, par ordre de
// préférence, qui soit le français ou l'anglais ; sinon le français.
export function langueDuNavigateur(entete: string | null): Locale {
  if (!entete) return DEFAULT_LOCALE
  const langues = entete.split(',').map((partie, i) => {
    const [code, ...params] = partie.trim().toLowerCase().split(';')
    const q = Number(params.find(p => p.trim().startsWith('q='))?.trim().slice(2) ?? 1)
    return { code, q: Number.isNaN(q) ? 0 : q, i }
  }).sort((a, b) => b.q - a.q || a.i - b.i)
  for (const { code } of langues) {
    if (code.startsWith('fr')) return 'fr'
    if (code.startsWith('en')) return 'en'
  }
  return DEFAULT_LOCALE
}

/** Variante serveur de `useT()` : `const t = getT(await getLocale())`. */
export function getT(locale: Locale) {
  return (fr: string, en: string) => t(locale, fr, en)
}

/** Langue choisie explicitement sur ce navigateur (cookie posé), sinon null. */
export async function getLocaleExplicite(): Promise<Locale | null> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : null
}
