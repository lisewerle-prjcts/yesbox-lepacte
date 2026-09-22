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

// Durée de conservation des données après la fin de l'accès payé (résiliation
// ou échéance non renouvelée), avant clôture définitive du compte.
export const RETENTION_MOIS = 13
