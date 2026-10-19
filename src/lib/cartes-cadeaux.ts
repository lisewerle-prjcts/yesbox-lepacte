import { randomInt } from 'crypto'
import type Stripe from 'stripe'
import type { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { envoyerMail } from '@/lib/mailer'
import { ajouterMois } from '@/lib/dates'
import { accorderMoisGratuits } from '@/lib/parrainage'
import { t, isLocale, type Locale } from '@/lib/i18n/locale'

type AdminClient = ReturnType<typeof createAdminClient>

// Cartes cadeaux (page /offrir) : 1, 2 ou 3 mois d'abonnement offerts,
// achetés par paiement unique Stripe. Chaque achat crée un code
// YES-XXXX-XXXX, valable 1 an, utilisable une seule fois par un couple
// (Mon compte, /abonnement ou inscription). Cf. supabase/schema.sql,
// bloc « CARTES CADEAUX ».

export const DUREES_CARTE_CADEAU = [1, 2, 3] as const
export type DureeCarteCadeau = (typeof DUREES_CARTE_CADEAU)[number]

export const VALIDITE_CARTE_CADEAU_MOIS = 12
// Les lignes sont effacées 24 mois après la fin de validité de la carte.
const CONSERVATION_APRES_VALIDITE_MOIS = 24

export function estDureeCarteCadeau(n: number): n is DureeCarteCadeau {
  return (DUREES_CARTE_CADEAU as readonly number[]).includes(n)
}

// Prix Stripe des trois produits « carte cadeau » (paiement unique).
export function prixCarteCadeauId(duree: DureeCarteCadeau): string | undefined {
  return {
    1: process.env.STRIPE_PRICE_ID_CARTE_CADEAU_1_MOIS,
    2: process.env.STRIPE_PRICE_ID_CARTE_CADEAU_2_MOIS,
    3: process.env.STRIPE_PRICE_ID_CARTE_CADEAU_3_MOIS,
  }[duree]
}

export interface PrixCarteCadeau { duree: DureeCarteCadeau; montant: number | null; devise: string; configure: boolean }

// Montants lus dans Stripe (pour les afficher sur /offrir) ; montant null si
// le prix n'est pas configuré ou si Stripe ne répond pas.
export async function lirePrixCartesCadeaux(): Promise<PrixCarteCadeau[]> {
  return Promise.all(DUREES_CARTE_CADEAU.map(async duree => {
    const id = prixCarteCadeauId(duree)
    if (!id) return { duree, montant: null, devise: 'eur', configure: false }
    try {
      const prix = await getStripe().prices.retrieve(id)
      return { duree, montant: prix.unit_amount ?? null, devise: prix.currency, configure: true }
    } catch {
      return { duree, montant: null, devise: 'eur', configure: true }
    }
  }))
}

// Sans I, O, 0 ni 1 pour éviter les confusions à la lecture d'une carte imprimée.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function blocAleatoire() {
  let bloc = ''
  for (let i = 0; i < 4; i++) bloc += ALPHABET[randomInt(ALPHABET.length)]
  return bloc
}

export function genererCodeCadeau() {
  return `YES-${blocAleatoire()}-${blocAleatoire()}`
}

// Accepte un code saisi en minuscules, avec ou sans tirets ni espaces.
// Renvoie le code au format YES-XXXX-XXXX, ou null s'il n'en a pas la forme.
export function normaliserCodeCadeau(saisie: string): string | null {
  const brut = saisie.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^YES[A-Z0-9]{8}$/.test(brut)) return null
  return `YES-${brut.slice(3, 7)}-${brut.slice(7)}`
}

export interface CarteCadeau {
  id: string
  code: string
  duree_mois: number
  pour_soi: boolean
  de_la_part_de: string | null
  pour_qui: string | null
  acheteur_email: string | null
  montant_centimes: number | null
  devise: string | null
  stripe_session_id: string | null
  achete_le: string
  expire_le: string
  utilise_le: string | null
  utilise_par_couple_id: string | null
}

export function formaterDateCarte(date: string, locale: Locale) {
  return new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
}

export function lienCarteCadeau(code: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.fr'
  return `${appUrl}/offrir/carte/${code}`
}

// Crée la carte cadeau d'une session Stripe Checkout payée, une seule fois
// (appelée par le webhook et par la page de remerciement, le premier des
// deux la crée), puis envoie le code par e-mail à la personne qui l'a
// achetée. Renvoie la carte, ou null si la session n'est pas un achat de
// carte cadeau payé.
export async function enregistrerCarteCadeau(admin: AdminClient, session: Stripe.Checkout.Session): Promise<CarteCadeau | null> {
  if (session.metadata?.type !== 'carte_cadeau' || session.payment_status !== 'paid') return null

  const lireExistante = async () => {
    const { data } = await admin.from('cartes_cadeaux').select('*').eq('stripe_session_id', session.id).maybeSingle()
    return data as CarteCadeau | null
  }
  const existante = await lireExistante()
  if (existante) return existante

  const duree = Number(session.metadata.duree_mois)
  if (!estDureeCarteCadeau(duree)) return null
  const acheteLe = new Date(session.created * 1000)
  const locale: Locale = isLocale(session.metadata.langue) ? session.metadata.langue : 'fr'

  for (let essai = 0; essai < 5; essai++) {
    const { data, error } = await admin.from('cartes_cadeaux').insert({
      code: genererCodeCadeau(),
      duree_mois: duree,
      pour_soi: session.metadata.pour_soi === 'oui',
      de_la_part_de: session.metadata.de_la_part_de || null,
      pour_qui: session.metadata.pour_qui || null,
      acheteur_email: session.customer_details?.email ?? session.customer_email ?? null,
      montant_centimes: session.amount_total,
      devise: session.currency,
      stripe_session_id: session.id,
      achete_le: acheteLe.toISOString(),
      expire_le: ajouterMois(acheteLe, VALIDITE_CARTE_CADEAU_MOIS),
    }).select('*').single()

    if (!error) {
      const carte = data as CarteCadeau
      await envoyerEmailCarteCadeau(carte, locale)
      return carte
    }
    // 23505 : contrainte d'unicité. Soit la session vient d'être enregistrée
    // en parallèle (webhook et page de remerciement), soit le code tiré
    // existe déjà : on en tire un autre.
    if (error.code !== '23505') throw new Error(error.message)
    const enregistreeEntreTemps = await lireExistante()
    if (enregistreeEntreTemps) return enregistreeEntreTemps
  }
  throw new Error('Impossible de générer un code cadeau unique')
}

async function envoyerEmailCarteCadeau(carte: CarteCadeau, locale: Locale) {
  if (!carte.acheteur_email) return
  const mois = t(locale, `${carte.duree_mois} mois`, `${carte.duree_mois} month${carte.duree_mois > 1 ? 's' : ''}`)
  const p = (texte: string) => `<p style="margin:0 0 12px;">${texte}</p>`
  const corps = p(t(locale, 'Bonjour,', 'Hello,'))
    + p(t(locale,
      `Merci pour votre achat ! Voici votre carte cadeau YES BOX : <strong>${mois} d’abonnement</strong> au programme YES BOX – Le Pacte.`,
      `Thank you for your purchase! Here is your YES BOX gift card: <strong>${mois} of subscription</strong> to the YES BOX – Le Pacte program.`))
    + `<p style="margin:20px 0;text-align:center;"><span style="display:inline-block;font-family:monospace;font-size:22px;letter-spacing:.12em;padding:12px 20px;border:2px dashed #c5256e;border-radius:10px;background:white;">${carte.code}</span></p>`
    + p(carte.pour_soi
      ? t(locale,
        'Pour l’activer, connectez-vous sur yesbox-lepacte.fr et saisissez ce code dans Mon compte, rubrique « Ajouter un code » (ou lors de votre inscription).',
        'To activate it, log in at yesbox-lepacte.fr and enter this code in My Account, under "Add a code" (or when you sign up).')
      : t(locale,
        'Transmettez ce code au couple à qui vous l’offrez : il suffit de le saisir lors de l’inscription sur yesbox-lepacte.fr, ou plus tard dans Mon compte, rubrique « Ajouter un code ». Vous pouvez aussi imprimer la carte cadeau ci-dessous.',
        'Pass this code on to the couple you are giving it to: they just enter it when signing up at yesbox-lepacte.fr, or later in My Account, under "Add a code". You can also print the gift card below.'))
    + p(t(locale,
      `Valable jusqu’au ${formaterDateCarte(carte.expire_le, locale)}, pour un seul couple.`,
      `Valid until ${formaterDateCarte(carte.expire_le, locale)}, for one couple.`))
    + `<p style="margin:24px 0;"><a href="${lienCarteCadeau(carte.code)}" style="display:inline-block;background:#c5256e;color:white;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;">${t(locale, 'Télécharger la carte à imprimer', 'Download the printable card')}</a></p>`
    + p(t(locale, 'L’équipe YES BOX', 'The YES BOX team'))
  await envoyerMail({
    to: carte.acheteur_email,
    subject: t(locale, `Votre carte cadeau YES BOX : ${carte.code}`, `Your YES BOX gift card: ${carte.code}`),
    body: corps,
  })
}

export type ErreurCarteCadeau = 'invalide' | 'deja_utilisee' | 'expiree'

// Utilise une carte cadeau pour un couple : la carte est marquée utilisée
// (une seule fois, même sous concurrence), puis les mois sont accordés
// (crédit sur la prochaine facture Stripe si le couple paie déjà, sinon
// accès gratuit prolongé).
export async function utiliserCarteCadeau(admin: AdminClient, code: string, coupleId: string):
  Promise<{ erreur: ErreurCarteCadeau } | { dureeMois: number; mode: 'credit_stripe' | 'acces_gratuit' }> {
  const { data: carte } = await admin.from('cartes_cadeaux').select('id, duree_mois, expire_le, utilise_le').eq('code', code).maybeSingle()
  if (!carte) return { erreur: 'invalide' }
  if (carte.utilise_le) return { erreur: 'deja_utilisee' }
  if (new Date(carte.expire_le).getTime() <= Date.now()) return { erreur: 'expiree' }

  const { data: reservee, error } = await admin.from('cartes_cadeaux')
    .update({ utilise_le: new Date().toISOString(), utilise_par_couple_id: coupleId })
    .eq('id', carte.id).is('utilise_le', null)
    .select('id')
  if (error) throw new Error(error.message)
  if (!reservee?.length) return { erreur: 'deja_utilisee' }

  const mode = await accorderMoisGratuits(admin, coupleId, carte.duree_mois, `Carte cadeau YES BOX ${code}`)
  return { dureeMois: carte.duree_mois, mode }
}

export async function purgerCartesCadeaux(admin: AdminClient): Promise<number> {
  const limite = ajouterMois(new Date(), -CONSERVATION_APRES_VALIDITE_MOIS)
  const { data, error } = await admin.from('cartes_cadeaux').delete().lt('expire_le', limite).select('id')
  if (error) throw new Error(error.message)
  return data?.length ?? 0
}
