import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, RETENTION_MOIS } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { ajouterMois } from '@/lib/dates'

export const runtime = 'nodejs'

async function trouverCoupleId(admin: ReturnType<typeof createAdminClient>, sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.couple_id) return sub.metadata.couple_id
  const { data } = await admin.from('couples').select('id').eq('stripe_subscription_id', sub.id).maybeSingle()
  return data?.id ?? null
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 500 })
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

  // Idempotence : un event Stripe peut être livré plusieurs fois.
  const { error: insertError } = await admin.from('stripe_events').insert({ id: event.id, type: event.type })
  if (insertError) {
    // Contrainte unique violée -> déjà traité.
    return NextResponse.json({ received: true, deja_traite: true })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription' || !session.subscription) break
      const coupleId = session.metadata?.couple_id
      if (!coupleId) break

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const periodEnd = subscription.items.data[0]?.current_period_end

      await admin.from('couples').update({
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        stripe_subscription_id: subscription.id,
        subscription_status: 'actif',
        subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        subscription_cancel_at_period_end: false,
        subscription_canceled_at: null,
        data_retention_until: null,
      }).eq('id', coupleId)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const coupleId = await trouverCoupleId(admin, subscription)
      if (!coupleId) break

      const periodEnd = subscription.items.data[0]?.current_period_end
      const statut = subscription.status === 'active' || subscription.status === 'trialing' ? 'actif'
        : subscription.status === 'past_due' || subscription.status === 'unpaid' || subscription.status === 'incomplete' ? 'incomplet'
        : 'expire'

      await admin.from('couples').update({
        subscription_status: statut,
        subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        subscription_cancel_at_period_end: subscription.cancel_at_period_end,
      }).eq('id', coupleId)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const coupleId = await trouverCoupleId(admin, subscription)
      if (!coupleId) break

      // L'accès payé se termine ici : les 13 mois de conservation des
      // données démarrent maintenant (cf. RETENTION_MOIS et la tâche
      // planifiée /api/cron/purger-comptes-expires).
      await admin.from('couples').update({
        subscription_status: 'expire',
        subscription_cancel_at_period_end: false,
        data_retention_until: ajouterMois(new Date(), RETENTION_MOIS),
      }).eq('id', coupleId)
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
