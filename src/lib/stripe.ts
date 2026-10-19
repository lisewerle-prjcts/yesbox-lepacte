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

export const PRIX_ABONNEMENT_MENSUEL_ID = process.env.STRIPE_PRICE_ID_ABONNEMENT_MENSUEL
// « Pacte – notre rendez-vous annuel » (19 €/an), proposé une fois le pacte
// signé : accès complet pour 1 an, renouvelable, résiliable à tout moment.
export const PRIX_ABONNEMENT_ANNUEL_ID = process.env.STRIPE_PRICE_ID_ABONNEMENT_ANNUEL

export type FormuleAbonnement = 'mensuel' | 'annuel'

// Formule correspondant au prix Stripe de l'abonnement (null si prix inconnu).
export function formuleDuPrix(priceId: string | null | undefined): FormuleAbonnement | null {
  if (!priceId) return null
  if (priceId === PRIX_ABONNEMENT_ANNUEL_ID) return 'annuel'
  if (priceId === PRIX_ABONNEMENT_MENSUEL_ID) return 'mensuel'
  return null
}
