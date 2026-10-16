'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { getStripe, PRIX_ABONNEMENT_MENSUEL_ID, PRIX_ABONNEMENT_ANNUEL_ID } from '@/lib/stripe'
import { estAbonnementActif, estCompteResilie } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'
import { programmerBasculeAnnuelle } from '@/lib/bascule-annuelle'

async function getMonCoupleId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'auth' as const }
  const { data: profile } = await supabase.from('profiles').select('couple_id, email').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'couple' as const }
  return { coupleId: profile.couple_id as string, email: profile.email as string, userId: user.id }
}

const ERREUR_RENONCIATION = {
  fr: 'Coche la case pour demander l’accès immédiat aux modules avant de payer.',
  en: 'Tick the box to request immediate access to the modules before paying.',
}

// renonciationRetractation : la personne demande l'accès immédiat aux
// modules et renonce à son droit de rétractation de 14 jours dès cet accès
// (case cochée avant le paiement, date conservée dans les métadonnées Stripe).
export async function demarrerAbonnement(renonciationRetractation: boolean) {
  const locale = await getLocale()
  if (!renonciationRetractation) return { error: t(locale, ERREUR_RENONCIATION.fr, ERREUR_RENONCIATION.en) }
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (!PRIX_ABONNEMENT_MENSUEL_ID) return { error: t(locale, "L'abonnement n'est pas encore configuré (STRIPE_PRICE_ID_ABONNEMENT_MENSUEL manquant).", 'Subscriptions are not configured yet (missing STRIPE_PRICE_ID_ABONNEMENT_MENSUEL).') }

  const admin = createAdminClient()
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single()
  if (!couple) return { error: t(locale, 'Couple introuvable', 'Couple not found') }

  if (estCompteResilie(couple)) {
    return { error: t(locale,
      "Ce compte a été clos 1 an après la fin de l'abonnement : l'abonnement ne peut pas être réactivé sur cet espace. Il faut recommencer avec un nouveau compte.",
      'This account was closed 1 year after the subscription ended: the subscription cannot be reactivated on this space. You need to start over with a new account.'
    ) }
  }
  if (estAbonnementActif(couple)) {
    return { error: t(locale, 'Votre abonnement est déjà actif.', 'Your subscription is already active.') }
  }

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    let customerId = couple.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ctx.email,
        metadata: { couple_id: ctx.coupleId },
        preferred_locales: [locale],
      })
      customerId = customer.id
      await admin.from('couples').update({ stripe_customer_id: customerId }).eq('id', ctx.coupleId)
    } else {
      // Langue des e-mails Stripe (reçus, rappels de renouvellement).
      await stripe.customers.update(customerId, { preferred_locales: [locale] }).catch(() => {})
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PRIX_ABONNEMENT_MENSUEL_ID, quantity: 1 }],
      success_url: `${appUrl}/mon-compte?abonnement=succes`,
      cancel_url: `${appUrl}/abonnement?abonnement=annule`,
      subscription_data: { metadata: { couple_id: ctx.coupleId, renonciation_retractation: new Date().toISOString() } },
      metadata: { couple_id: ctx.coupleId, renonciation_retractation: new Date().toISOString() },
      allow_promotion_codes: true,
      // Page de paiement dans la langue du site.
      locale,
    })

    if (!session.url) return { error: t(locale, 'Impossible de créer la session de paiement', 'Could not create the checkout session') }
    return { url: session.url }
  } catch (err) {
    return { error: t(locale, `Erreur Stripe : ${(err as Error).message}`, `Stripe error: ${(err as Error).message}`) }
  }
}

// Bascule vers « Pacte – notre rendez-vous annuel » (19 €/an), proposée une
// fois le pacte signé (et programmée d'office à la seconde signature, cf.
// signerPacteModule). Deux cas :
//   - abonnement mensuel Stripe en cours : la bascule est programmée
//     (subscription schedule) à la fin du mois déjà payé. Rien ne change d'ici là ; à cette date, les 19 € sont prélevés sur la
//     carte enregistrée et une période d'un an commence. Un éventuel arrêt
//     du renouvellement demandé sur le mensuel est levé ;
//   - pas d'abonnement Stripe en cours : paiement immédiat via Stripe Checkout.
// Dans les deux cas, l'accès vaut pour 1 an, résiliable à tout moment depuis
// Mon compte (l'accès reste ouvert jusqu'au dernier jour payé).
export async function passerAuRendezVousAnnuel(renonciationRetractation = false) {
  const locale = await getLocale()
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (!PRIX_ABONNEMENT_ANNUEL_ID) return { error: t(locale, "Le rendez-vous annuel n'est pas encore configuré (STRIPE_PRICE_ID_ABONNEMENT_ANNUEL manquant).", 'The yearly date is not configured yet (missing STRIPE_PRICE_ID_ABONNEMENT_ANNUEL).') }

  const admin = createAdminClient()
  const [{ data: couple }, { data: signature }] = await Promise.all([
    admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single(),
    admin.from('couples').select('pacte_signe_le').eq('id', ctx.coupleId).single(),
  ])
  if (!couple) return { error: t(locale, 'Couple introuvable', 'Couple not found') }
  if (!signature?.pacte_signe_le) return { error: t(locale, 'Le rendez-vous annuel se propose une fois votre pacte signé.', 'The yearly date is available once your pact is signed.') }
  if (estCompteResilie(couple)) {
    return { error: t(locale,
      "Ce compte a été clos 1 an après la fin de l'abonnement : l'abonnement ne peut pas être réactivé sur cet espace. Il faut recommencer avec un nouveau compte.",
      'This account was closed 1 year after the subscription ended: the subscription cannot be reactivated on this space. You need to start over with a new account.'
    ) }
  }

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    if (couple.stripe_subscription_id && estAbonnementActif(couple)) {
      const res = await programmerBasculeAnnuelle(admin, ctx.coupleId, { reprendreSiArret: true })
      if ('raison' in res) {
        if (res.raison === 'deja_annuel') return { error: t(locale, 'Votre rendez-vous annuel est déjà actif.', 'Your yearly date is already active.') }
        if (res.raison === 'deja_programme') return { error: t(locale, 'Le passage au rendez-vous annuel est déjà programmé.', 'The switch to the yearly date is already scheduled.') }
        return { error: t(locale, 'Abonnement Stripe introuvable', 'Stripe subscription not found') }
      }
      revalidatePath('/mon-compte')
      revalidatePath('/journal')
      return { success: true, basculeLe: res.basculeLe }
    }

    // Paiement immédiat : accès immédiat demandé, case cochée avant le paiement.
    if (!renonciationRetractation) return { error: t(locale, ERREUR_RENONCIATION.fr, ERREUR_RENONCIATION.en) }

    let customerId = couple.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ctx.email,
        metadata: { couple_id: ctx.coupleId },
        preferred_locales: [locale],
      })
      customerId = customer.id
      await admin.from('couples').update({ stripe_customer_id: customerId }).eq('id', ctx.coupleId)
    } else {
      // Langue des e-mails Stripe (reçus, rappels de renouvellement).
      await stripe.customers.update(customerId, { preferred_locales: [locale] }).catch(() => {})
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PRIX_ABONNEMENT_ANNUEL_ID, quantity: 1 }],
      success_url: `${appUrl}/mon-compte?abonnement=succes`,
      cancel_url: `${appUrl}/journal?abonnement=annule`,
      subscription_data: { metadata: { couple_id: ctx.coupleId, formule: 'annuel', renonciation_retractation: new Date().toISOString() } },
      metadata: { couple_id: ctx.coupleId, formule: 'annuel', renonciation_retractation: new Date().toISOString() },
      allow_promotion_codes: true,
      // Page de paiement dans la langue du site.
      locale,
    })

    if (!session.url) return { error: t(locale, 'Impossible de créer la session de paiement', 'Could not create the checkout session') }
    return { url: session.url }
  } catch (err) {
    return { error: t(locale, `Erreur Stripe : ${(err as Error).message}`, `Stripe error: ${(err as Error).message}`) }
  }
}

// Annule la bascule programmée vers le rendez-vous annuel : le planning
// Stripe est libéré, l'abonnement mensuel continue comme avant.
export async function annulerBasculeAnnuelle() {
  const locale = await getLocale()
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const admin = createAdminClient()
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single()
  if (!couple?.stripe_subscription_id) return { error: t(locale, 'Aucun abonnement en cours', 'No subscription in progress') }

  try {
    await libererPlanning(couple.stripe_subscription_id)
    await admin.from('couples').update({ subscription_annuel_prevu_le: null }).eq('id', ctx.coupleId)
    revalidatePath('/mon-compte')
    revalidatePath('/journal')
    return { success: true }
  } catch (err) {
    return { error: t(locale, `Erreur Stripe : ${(err as Error).message}`, `Stripe error: ${(err as Error).message}`) }
  }
}

// Libère le planning Stripe éventuellement attaché à l'abonnement (bascule
// annuelle programmée) : l'abonnement reste tel quel, sans changement prévu.
async function libererPlanning(subscriptionId: string) {
  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  if (!sub.schedule) return
  const scheduleId = typeof sub.schedule === 'string' ? sub.schedule : sub.schedule.id
  await stripe.subscriptionSchedules.release(scheduleId)
}

export async function annulerAbonnement() {
  const locale = await getLocale()
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const admin = createAdminClient()
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single()
  if (!couple?.stripe_subscription_id) return { error: t(locale, 'Aucun abonnement actif à résilier', 'No active subscription to cancel') }

  const stripe = getStripe()
  try {
    // Arrêter le renouvellement annule aussi une bascule annuelle programmée.
    await libererPlanning(couple.stripe_subscription_id)
    const subscription = await stripe.subscriptions.update(couple.stripe_subscription_id, { cancel_at_period_end: true })

    await admin.from('couples').update({ subscription_annuel_prevu_le: null }).eq('id', ctx.coupleId)
    await admin.from('couples').update({
      subscription_cancel_at_period_end: true,
      subscription_canceled_at: new Date().toISOString(),
      subscription_current_period_end: subscription.items.data[0]?.current_period_end
        ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
        : couple.subscription_current_period_end,
    }).eq('id', ctx.coupleId)

    revalidatePath('/mon-compte')
    return { success: true }
  } catch (err) {
    return { error: t(locale, `Erreur Stripe : ${(err as Error).message}`, `Stripe error: ${(err as Error).message}`) }
  }
}

export async function utiliserCodeGratuit(code: string) {
  const locale = await getLocale()
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const cleanCode = code.trim()
  if (!cleanCode) return { error: t(locale, 'Code requis', 'Code required') }

  const admin = createAdminClient()
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single()
  if (estCompteResilie(couple)) {
    return { error: t(locale, "Ce compte a été résilié : impossible d'utiliser un code sur cet espace.", 'This account was closed: a code cannot be redeemed on this space.') }
  }

  const { data, error } = await admin.rpc('utiliser_code_gratuit', { p_code: cleanCode, p_couple_id: ctx.coupleId })
  if (error) return { error: error.message }

  const messages: Record<string, { fr: string; en: string }> = {
    invalide: { fr: 'Code invalide', en: 'Invalid code' },
    epuise: { fr: 'Ce code a atteint son nombre maximum d’utilisations', en: 'This code has reached its usage limit' },
    deja_utilise: { fr: 'Ton couple a déjà utilisé un code gratuit', en: 'Your couple already redeemed a free code' },
  }
  if (!data?.success) {
    const msg = messages[data?.error] ?? { fr: 'Code invalide', en: 'Invalid code' }
    return { error: t(locale, msg.fr, msg.en) }
  }

  revalidatePath('/mon-compte')
  revalidatePath('/tableau-de-bord')
  revalidatePath('/abonnement')
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
  try {
    await stripe.subscriptions.update(couple.stripe_subscription_id, { cancel_at_period_end: false })

    await admin.from('couples').update({
      subscription_cancel_at_period_end: false,
      subscription_canceled_at: null,
    }).eq('id', ctx.coupleId)

    revalidatePath('/mon-compte')
    return { success: true }
  } catch (err) {
    return { error: t(locale, `Erreur Stripe : ${(err as Error).message}`, `Stripe error: ${(err as Error).message}`) }
  }
}
