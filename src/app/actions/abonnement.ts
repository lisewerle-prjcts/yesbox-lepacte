'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { getStripe, PRIX_ABONNEMENT_MENSUEL_ID } from '@/lib/stripe'
import { estAbonnementActif, estCompteResilie } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'

async function getMonCoupleId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'auth' as const }
  const { data: profile } = await supabase.from('profiles').select('couple_id, email').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'couple' as const }
  return { coupleId: profile.couple_id as string, email: profile.email as string, userId: user.id }
}

export async function demarrerAbonnement() {
  const locale = await getLocale()
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (!PRIX_ABONNEMENT_MENSUEL_ID) return { error: t(locale, "L'abonnement n'est pas encore configuré (STRIPE_PRICE_ID_ABONNEMENT_MENSUEL manquant).", 'Subscriptions are not configured yet (missing STRIPE_PRICE_ID_ABONNEMENT_MENSUEL).') }

  const admin = createAdminClient()
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single()
  if (!couple) return { error: t(locale, 'Couple introuvable', 'Couple not found') }

  if (estCompteResilie(couple)) {
    return { error: t(locale,
      "Ce compte a été résilié après 13 mois d'inactivité de l'abonnement : l'abonnement ne peut pas être réactivé sur cet espace. Il faut recommencer avec un nouveau compte.",
      'This account was closed after 13 months without an active subscription: the subscription cannot be reactivated on this space. You need to start over with a new account.'
    ) }
  }
  if (estAbonnementActif(couple)) {
    return { error: t(locale, 'Votre abonnement est déjà actif.', 'Your subscription is already active.') }
  }

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  let customerId = couple.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.email,
      metadata: { couple_id: ctx.coupleId },
    })
    customerId = customer.id
    await admin.from('couples').update({ stripe_customer_id: customerId }).eq('id', ctx.coupleId)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: PRIX_ABONNEMENT_MENSUEL_ID, quantity: 1 }],
    success_url: `${appUrl}/mon-compte?abonnement=succes`,
    cancel_url: `${appUrl}/abonnement?abonnement=annule`,
    subscription_data: { metadata: { couple_id: ctx.coupleId } },
    metadata: { couple_id: ctx.coupleId },
    allow_promotion_codes: true,
  })

  if (!session.url) return { error: t(locale, 'Impossible de créer la session de paiement', 'Could not create the checkout session') }
  return { url: session.url }
}

export async function annulerAbonnement() {
  const locale = await getLocale()
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const admin = createAdminClient()
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single()
  if (!couple?.stripe_subscription_id) return { error: t(locale, 'Aucun abonnement actif à résilier', 'No active subscription to cancel') }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.update(couple.stripe_subscription_id, { cancel_at_period_end: true })

  await admin.from('couples').update({
    subscription_cancel_at_period_end: true,
    subscription_canceled_at: new Date().toISOString(),
    subscription_current_period_end: subscription.items.data[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
      : couple.subscription_current_period_end,
  }).eq('id', ctx.coupleId)

  revalidatePath('/mon-compte')
  return { success: true }
}

export async function reprendreAbonnement() {
  const locale = await getLocale()
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const admin = createAdminClient()
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single()
  if (!couple?.stripe_subscription_id) return { error: t(locale, 'Aucun abonnement à reprendre', 'No subscription to resume') }
  if (!couple.subscription_cancel_at_period_end) return { error: t(locale, 'Votre abonnement continue déjà.', 'Your subscription is already continuing.') }
  if (!estAbonnementActif(couple)) return { error: t(locale, "La période payée est déjà terminée : relance l'abonnement depuis la page Abonnement.", 'The paid period has already ended: restart your subscription from the Subscription page.') }

  const stripe = getStripe()
  await stripe.subscriptions.update(couple.stripe_subscription_id, { cancel_at_period_end: false })

  await admin.from('couples').update({
    subscription_cancel_at_period_end: false,
    subscription_canceled_at: null,
  }).eq('id', ctx.coupleId)

  revalidatePath('/mon-compte')
  return { success: true }
}
