import { createAdminClient } from '@/lib/supabase/server'
import { envoyerMail } from '@/lib/mailer'
import type { Locale } from '@/lib/i18n/locale'
import { piedDePageRappel } from '@/lib/desinscription'
import { modeleEmail, type ContenuEmail } from './catalogue'
import { corpsAvecMotPersonnel, rendreCorps, rendreObjet, type Variables } from './rendu'

// Modèles d'e-mails modifiés depuis l'admin : réglages
// « modele_email::<clé>::<langue> » (JSON { objet, corps }) ; sans réglage,
// le texte du catalogue. Les anciens réglages de l'e-mail de bienvenue
// (email_bienvenue_subject / email_bienvenue_body, version française) sont
// encore lus tant qu'il n'y a pas de nouveau réglage.

export const PREFIXE_MODELE = 'modele_email::'
const BIENVENUE_ANCIEN = { objet: 'email_bienvenue_subject', corps: 'email_bienvenue_body' }

export function cleReglageModele(cle: string, locale: Locale) {
  return `${PREFIXE_MODELE}${cle}::${locale}`
}

// Relu au plus une fois par minute (la tâche planifiée envoie beaucoup
// d'e-mails d'affilée).
let cache: { le: number; reglages: Map<string, string> } | null = null
const DUREE_CACHE_MS = 60_000

export function viderCacheModeles() {
  cache = null
}

async function reglages(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.le < DUREE_CACHE_MS) return cache.reglages
  const admin = createAdminClient()
  const [{ data: modeles }, { data: anciens }] = await Promise.all([
    admin.from('settings').select('key, value').like('key', `${PREFIXE_MODELE}%`),
    admin.from('settings').select('key, value').in('key', [BIENVENUE_ANCIEN.objet, BIENVENUE_ANCIEN.corps]),
  ])
  const map = new Map<string, string>()
  for (const r of [...(modeles ?? []), ...(anciens ?? [])]) map.set(r.key, r.value)
  cache = { le: Date.now(), reglages: map }
  return map
}

function lireSurcharge(valeur: string | undefined): ContenuEmail | null {
  if (!valeur) return null
  try {
    const v = JSON.parse(valeur) as Partial<ContenuEmail>
    return typeof v.objet === 'string' && typeof v.corps === 'string' ? { objet: v.objet, corps: v.corps } : null
  } catch {
    return null
  }
}

// Contenu en vigueur (modifié dans l'admin, sinon celui du catalogue).
export async function contenuModele(cle: string, locale: Locale): Promise<ContenuEmail> {
  const modele = modeleEmail(cle)
  const r = await reglages()
  const surcharge = lireSurcharge(r.get(cleReglageModele(cle, locale)))
  if (surcharge) return surcharge
  if (cle === 'bienvenue' && locale === 'fr' && (r.has(BIENVENUE_ANCIEN.objet) || r.has(BIENVENUE_ANCIEN.corps))) {
    return { objet: r.get(BIENVENUE_ANCIEN.objet) ?? modele.fr.objet, corps: r.get(BIENVENUE_ANCIEN.corps) ?? modele.fr.corps }
  }
  return modele[locale]
}

export async function contenusModeles(): Promise<Record<string, Record<Locale, ContenuEmail>>> {
  const { MODELES_EMAIL } = await import('./catalogue')
  const resultat: Record<string, Record<Locale, ContenuEmail>> = {}
  for (const m of MODELES_EMAIL) {
    resultat[m.cle] = { fr: await contenuModele(m.cle, 'fr'), en: await contenuModele(m.cle, 'en') }
  }
  return resultat
}

export async function rendreModele(cle: string, locale: Locale, vars: Variables) {
  const modele = modeleEmail(cle)
  const contenu = await contenuModele(cle, locale)
  const corps = corpsAvecMotPersonnel(contenu.corps, vars.mot_personnel as string | undefined)
  return { objet: rendreObjet(contenu.objet, vars), html: rendreCorps(corps, vars, modele.facultatives) }
}

// Envoie un modèle. Pour un rappel, `desinscription` (id de la personne)
// ajoute le lien « Ne plus recevoir ces rappels ».
export async function envoyerModele(options: {
  to: string
  cle: string
  locale: Locale
  vars: Variables
  desinscription?: string
  etiquette?: string
}): Promise<boolean> {
  const modele = modeleEmail(options.cle)
  const { objet, html } = await rendreModele(options.cle, options.locale, options.vars)
  const pied = modele.rappel && options.desinscription ? piedDePageRappel(options.desinscription, options.locale) : ''
  return envoyerMail({ to: options.to, subject: objet, body: html + pied, etiquette: options.etiquette ?? modele.etiquette })
}
