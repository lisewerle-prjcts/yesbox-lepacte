'use server'

import { redirect } from 'next/navigation'
import { getEffectiveSession } from '@/lib/effective-session'
import { getStripe, PRIX_ACCES_COMPLET_CENTIMES } from '@/lib/stripe'

// Crée une session Stripe Checkout pour l'accès complet (89€, paiement unique)
// et redirige l'utilisateur vers la page de paiement hébergée par Stripe.
export async function creerSessionPaiement() {
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')
  const { profile } = session
  if (!profile.couple_id) redirect('/tableau-de-bord')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
  const stripe = getStripe()

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: profile.email || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: PRIX_ACCES_COMPLET_CENTIMES,
        product_data: {
          name: 'YES BOX — Le Pacte · Accès complet',
          description: 'Les 10 modules, les sessions de révélation à deux, votre CDD de couple. Paiement unique, accès à vie.',
        },
      },
    }],
    metadata: { couple_id: profile.couple_id },
    success_url: `${baseUrl}/paiement/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/tableau-de-bord`,
  })

  if (!checkoutSession.url) redirect('/tableau-de-bord')
  redirect(checkoutSession.url)
}
