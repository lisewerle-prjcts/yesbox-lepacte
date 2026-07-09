import Stripe from 'stripe'

export const PRIX_ACCES_COMPLET_CENTIMES = 8900

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY manquant')
  return new Stripe(key)
}
