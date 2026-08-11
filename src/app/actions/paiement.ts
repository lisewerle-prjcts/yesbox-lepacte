'use server'

import { redirect } from 'next/navigation'
import { getEffectiveSession } from '@/lib/effective-session'
import { getStripe, PRIX_ABONNEMENT_CENTIMES } from '@/lib/stripe'

// Crée une session Stripe Checkout pour l'abonnement Accès complet
// (29€/mois, résiliable à tout moment) et redirige vers la page de paiement
// hébergée par Stripe. Le module 1 reste jouable gratuitement jusqu'à sa
// révélation — cet abonnement débloque la suite (modules 2 à 10).
export async function creerSessionPaiement() {
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')
  const { profile } = session
  if (!profile.couple_id) redirect('/tableau-de-bord')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
  const stripe = getStripe()

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: profile.email || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: PRIX_ABONNEMENT_CENTIMES,
        recurring: { interval: 'month' },
        product_data: {
          name: 'YES BOX — Le Pacte · Accès complet',
          description: 'Les modules 2 à 10, les sessions de révélation à deux, votre CDD de couple. Abonnement mensuel, résiliable à tout moment.',
        },
      },
    }],
    metadata: { couple_id: profile.couple_id },
    subscription_data: { metadata: { couple_id: profile.couple_id } },
    success_url: `${baseUrl}/paiement/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/tableau-de-bord`,
  })

  if (!checkoutSession.url) redirect('/tableau-de-bord')
  redirect(checkoutSession.url)
}
