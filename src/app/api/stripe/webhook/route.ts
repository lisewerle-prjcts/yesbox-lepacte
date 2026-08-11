import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Un webhook Stripe n'a pas de session utilisateur : on utilise le client
// service role pour marquer le couple comme abonné, et la signature du
// webhook (STRIPE_WEBHOOK_SECRET) fait office d'authentification.
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 400 })
  }

  const body = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: `Signature invalide : ${(err as Error).message}` }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object as Stripe.Checkout.Session
    const coupleId = checkoutSession.metadata?.couple_id
    if (coupleId) {
      await admin.from('couples').update({
        a_paye: true,
        paye_at: new Date().toISOString(),
        stripe_customer_id: typeof checkoutSession.customer === 'string' ? checkoutSession.customer : null,
        stripe_checkout_session_id: checkoutSession.id,
        stripe_subscription_id: typeof checkoutSession.subscription === 'string' ? checkoutSession.subscription : null,
        abonnement_statut: 'active',
      }).eq('id', coupleId)
    }
  }

  // L'abonnement peut ensuite évoluer (résiliation, échec de paiement,
  // renouvellement) indépendamment de la session de checkout initiale.
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const actif = subscription.status === 'active' || subscription.status === 'trialing'
    await admin.from('couples').update({
      a_paye: actif,
      abonnement_statut: subscription.status,
    }).eq('stripe_subscription_id', subscription.id)
  }

  return NextResponse.json({ received: true })
}
