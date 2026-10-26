import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, formuleDuPrix } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { ajouterMois } from '@/lib/dates'
import { INACTIVITE_MOIS } from '@/lib/conservation'
import { enregistrerCarteCadeau } from '@/lib/cartes-cadeaux'
import { enregistrerPackInitial, consommerCredit } from '@/lib/pack-initial'
import { marquerReductionUtilisee } from '@/lib/reduction-code'

export const runtime = 'nodejs'

async function trouverCoupleId(admin: ReturnType<typeof createAdminClient>, sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.couple_id) {
    // Un événement tardif sur un ancien abonnement (ex. mensuel terminé,
    // remplacé depuis par le rendez-vous annuel) ne doit pas écraser
    // l'abonnement en cours du couple.
    const { data } = await admin.from('couples').select('stripe_subscription_id').eq('id', sub.metadata.couple_id).maybeSingle()
    if (data?.stripe_subscription_id && data.stripe_subscription_id !== sub.id) return null
    return sub.metadata.couple_id
  }
  const { data } = await admin.from('couples').select('id').eq('stripe_subscription_id', sub.id).maybeSingle()
  return data?.id ?? null
}

// Formule (mensuel / annuel) et bascule annuelle programmée, répliquées à part : si la colonne
// subscription_formule n'existe pas encore en base, la mise à jour du statut
// d'abonnement (qui conditionne l'accès) passe quand même.
async function enregistrerFormule(admin: ReturnType<typeof createAdminClient>, coupleId: string, sub: Stripe.Subscription) {
  const formule = formuleDuPrix(sub.items.data[0]?.price?.id)
  if (!formule) return
  // Passage effectif à l'annuel (fin du mois payé, ou paiement direct) : la
  // bascule programmée est accomplie.
  await admin.from('couples').update(
    formule === 'annuel' ? { subscription_formule: formule, subscription_annuel_prevu_le: null } : { subscription_formule: formule }
  ).eq('id', coupleId)
}

// Écriture en base qui doit réussir : une erreur Supabase est levée, pour que
// l'événement Stripe soit renvoyé plus tard (cf. le try/catch de POST).
async function ecrire(requete: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await requete
  if (error) throw new Error(error.message)
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

  // En cas d'erreur pendant le traitement, l'événement n'est plus marqué
  // comme traité et Stripe le renvoie plus tard (réponse 500) : un paiement
  // n'est jamais perdu.
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Achat d'une carte cadeau (paiement unique, page /offrir) : le code
        // est créé ici et envoyé par e-mail à la personne qui l'a achetée.
        if (session.mode === 'payment' && session.metadata?.type === 'carte_cadeau') {
          await enregistrerCarteCadeau(admin, session)
          break
        }
        // Achat du pack initial (paiement unique, /abonnement) : le pack est
        // ouvert pour 1 an, le crédit de parrainage appliqué en réduction
        // est retiré du solde Stripe et le code de réduction marqué utilisé
        // (une seule fois : événement idempotent).
        if (session.mode === 'payment' && session.metadata?.type === 'pack_initial') {
          await enregistrerPackInitial(admin, session)
          const credit = Number(session.metadata.credit_parrainage_centimes) || 0
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
          if (credit > 0 && customerId && session.payment_status === 'paid') await consommerCredit(customerId, credit)
          if (session.payment_status === 'paid') await marquerReductionUtilisee(admin, session.metadata.reduction_utilisation_id)
          break
        }
        if (session.mode !== 'subscription' || !session.subscription) break
        const coupleId = session.metadata?.couple_id
        if (!coupleId) break

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const periodEnd = subscription.items.data[0]?.current_period_end

        await ecrire(admin.from('couples').update({
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          stripe_subscription_id: subscription.id,
          subscription_status: 'actif',
          subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          subscription_cancel_at_period_end: false,
          subscription_canceled_at: null,
        }).eq('id', coupleId))
        await enregistrerFormule(admin, coupleId, subscription)
        await marquerReductionUtilisee(admin, session.metadata?.reduction_utilisation_id)
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

        await ecrire(admin.from('couples').update({
          subscription_status: statut,
          subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          subscription_cancel_at_period_end: subscription.cancel_at_period_end,
        }).eq('id', coupleId))
        await enregistrerFormule(admin, coupleId, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const coupleId = await trouverCoupleId(admin, subscription)
        if (!coupleId) break

        await ecrire(admin.from('couples').update({
          subscription_status: 'expire',
          subscription_cancel_at_period_end: false,
        }).eq('id', coupleId))
        // L'accès payé se termine ici : les 24 mois avant effacement des
        // données (sans nouvelle visite) partent au plus tôt de maintenant
        // (cf. src/lib/conservation.ts, recalculé chaque nuit).
        const effacementMin = ajouterMois(new Date(), INACTIVITE_MOIS)
        const { data: actuel } = await admin.from('couples').select('effacement_prevu_le').eq('id', coupleId).maybeSingle()
        if (!actuel?.effacement_prevu_le || new Date(actuel.effacement_prevu_le).getTime() < new Date(effacementMin).getTime()) {
          await ecrire(admin.from('couples').update({ effacement_prevu_le: effacementMin }).eq('id', coupleId))
        }
        await admin.from('couples').update({ subscription_annuel_prevu_le: null }).eq('id', coupleId)
        break
      }

      default:
        break
    }
  } catch (err) {
    await admin.from('stripe_events').delete().eq('id', event.id)
    console.error(`[stripe] ${event.type} ${event.id} : ${(err as Error).message}`)
    return NextResponse.json({ error: 'Traitement impossible, réessayer plus tard' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
