import Stripe from 'stripe'

export const PRIX_ABONNEMENT_CENTIMES = 2900

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY manquant')
  return new Stripe(key)
}
