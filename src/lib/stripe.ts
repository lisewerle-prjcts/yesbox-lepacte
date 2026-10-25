import Stripe from 'stripe'

let client: Stripe | null = null

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY manquant : configure les variables Stripe dans .env.local')
    client = new Stripe(key)
  }
  return client
}

// Pack initial YES BOX – Le Pacte : 58 € payés une fois à la fin du module 1
// gratuit, pour les modules 2 à 9 (jusqu'au pacte), avec 1 an pour les
// réaliser. Prix Stripe à paiement unique (cf. demarrerAbonnement).
export const PRIX_YESBOX_ID = process.env.STRIPE_PRICE_ID_YESBOX
// Ancien abonnement mensuel (29 €/mois) : plus vendu, conservé pour les
// couples qui y sont encore abonnés (bascule vers l'annuel, formule).
export const PRIX_ABONNEMENT_MENSUEL_ID = process.env.STRIPE_PRICE_ID_ABONNEMENT_MENSUEL
// « Pacte – notre rendez-vous annuel » (19 €/an), facultatif : nécessaire
// pour le module de renouvellement à la date choisie par le couple, et pour
// continuer le parcours au-delà de l'année du pack initial. Accès complet
// pour 1 an, renouvelable, résiliable à tout moment.
export const PRIX_ABONNEMENT_ANNUEL_ID = process.env.STRIPE_PRICE_ID_ABONNEMENT_ANNUEL

export type FormuleAbonnement = 'mensuel' | 'annuel'

// Formule correspondant au prix Stripe de l'abonnement (null si prix inconnu).
export function formuleDuPrix(priceId: string | null | undefined): FormuleAbonnement | null {
  if (!priceId) return null
  if (priceId === PRIX_ABONNEMENT_ANNUEL_ID) return 'annuel'
  if (priceId === PRIX_ABONNEMENT_MENSUEL_ID) return 'mensuel'
  return null
}
