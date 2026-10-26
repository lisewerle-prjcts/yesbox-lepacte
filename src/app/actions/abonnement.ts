'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { getStripe, PRIX_YESBOX_ID, PRIX_ABONNEMENT_ANNUEL_ID } from '@/lib/stripe'
import { aAccesComplet, aPackInitialActif, estAbonnementActif, estCompteResilie, aDejaEuLaYesBox } from '@/lib/abonnement'
import { creditDisponible, reductionCredit } from '@/lib/pack-initial'
import { ABONNEMENT_COLONNES } from '@/types'
import { programmerBasculeAnnuelle } from '@/lib/bascule-annuelle'
import { estCarteYesBox, normaliserCodeCadeau, utiliserCarteCadeau } from '@/lib/cartes-cadeaux'
import { enregistrerParrainage } from '@/lib/parrainage'

async function getMonCoupleId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'auth' as const }
  const { data: profile } = await supabase.from('profiles').select('couple_id, email').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'couple' as const }
  return { coupleId: profile.couple_id as string, email: profile.email as string, userId: user.id }
}

const ERREUR_RENONCIATION = {
  fr: 'Coche les deux cases avant de payer.',
  en: 'Tick both boxes before paying.',
}

// Achat du pack initial YES BOX – Le Pacte, proposé à la fin du module 1
// gratuit : 58 € en paiement unique (prix STRIPE_PRICE_ID_YESBOX) pour les
// modules 2 à 9, jusqu'au pacte, avec 1 an pour les réaliser. Pas de
// renouvellement automatique : l'abonnement annuel (19 €/an) est proposé à
// part, pour le module de renouvellement. Un crédit de parrainage (solde
// client Stripe) est appliqué par une réduction (cf. src/lib/pack-initial.ts).
// renonciationRetractation : cases « J'ai lu et j'accepte les CGV » et « Je
// demande l'accès immédiat et renonce à mon droit de rétractation dès cet
// accès » cochées avant le paiement (date conservée dans les métadonnées
// Stripe).
export async function demarrerAbonnement(renonciationRetractation: boolean) {
  const locale = await getLocale()
  if (!renonciationRetractation) return { error: t(locale, ERREUR_RENONCIATION.fr, ERREUR_RENONCIATION.en) }
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (!PRIX_YESBOX_ID) return { error: t(locale, "Le pack initial n'est pas encore configuré (STRIPE_PRICE_ID_YESBOX manquant).", 'The starter pack is not configured yet (missing STRIPE_PRICE_ID_YESBOX).') }

  const admin = createAdminClient()
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single()
  if (!couple) return { error: t(locale, 'Couple introuvable', 'Couple not found') }

  if (estCompteResilie(couple)) {
    return { error: t(locale,
      "Ce compte a été clos : il ne peut pas être réactivé sur cet espace. Il faut recommencer avec un nouveau compte.",
      'This account was closed: it cannot be reactivated on this space. You need to start over with a new account.'
    ) }
  }
  if (aPackInitialActif(couple) || aAccesComplet(couple)) {
    return { error: t(locale, 'Votre accès au parcours est déjà ouvert.', 'Your access to the program is already open.') }
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
      // Langue des e-mails Stripe (reçus).
      await stripe.customers.update(customerId, { preferred_locales: [locale] }).catch(() => {})
    }

    // Crédit de parrainage : réduction sur le pack, en laissant au moins
    // 0,50 € à payer (minimum Stripe d'un paiement).
    const prix = await stripe.prices.retrieve(PRIX_YESBOX_ID)
    const credit = Math.min(await creditDisponible(customerId), Math.max(0, (prix.unit_amount ?? 0) - 50))
    const coupon = credit > 0 ? await reductionCredit(credit) : null

    const maintenant = new Date().toISOString()
    const metadata = { type: 'pack_initial', couple_id: ctx.coupleId, credit_parrainage_centimes: String(credit), cgv_acceptees_le: maintenant, renonciation_retractation_le: maintenant }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: PRIX_YESBOX_ID, quantity: 1 }],
      ...(coupon ? { discounts: [{ coupon }] } : { allow_promotion_codes: true }),
      success_url: `${appUrl}/abonnement/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/abonnement?abonnement=annule`,
      metadata,
      payment_intent_data: { metadata, description: 'Pack initial YES BOX – Le Pacte' },
      invoice_creation: { enabled: true },
      // Page de paiement dans la langue du site.
      locale,
    })

    if (!session.url) return { error: t(locale, 'Impossible de créer la session de paiement', 'Could not create the checkout session') }
    return { url: session.url }
  } catch (err) {
    return { error: t(locale, `Erreur Stripe : ${(err as Error).message}`, `Stripe error: ${(err as Error).message}`) }
  }
}

// Abonnement « Pacte – notre rendez-vous annuel » (19 €/an), facultatif,
// proposé une fois le pacte signé ou le pack initial obtenu (acheté ou
// offert) : nécessaire pour le module de renouvellement. Sert aussi à la
// bascule des anciens abonnements mensuels (programmée d'office à la seconde signature, cf.
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
  const [{ data: couple }, dejaEuLaYesBox] = await Promise.all([
    admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', ctx.coupleId).single(),
    aDejaEuLaYesBox(admin, ctx.coupleId),
  ])
  if (!couple) return { error: t(locale, 'Couple introuvable', 'Couple not found') }
  if (!dejaEuLaYesBox) return { error: t(locale, 'Le rendez-vous annuel se propose une fois votre pack initial obtenu.', 'The yearly date is available once you have your starter pack.') }
  if (estCompteResilie(couple)) {
    return { error: t(locale,
      "Ce compte a été clos : l'abonnement ne peut pas être réactivé sur cet espace. Il faut recommencer avec un nouveau compte.",
      'This account was closed: the subscription cannot be reactivated on this space. You need to start over with a new account.'
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

    // Paiement immédiat : CGV acceptées (accès immédiat demandé) avant le paiement.
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
      subscription_data: { metadata: { couple_id: ctx.coupleId, formule: 'annuel', cgv_acceptees_le: new Date().toISOString(), renonciation_retractation_le: new Date().toISOString() } },
      metadata: { couple_id: ctx.coupleId, formule: 'annuel', cgv_acceptees_le: new Date().toISOString(), renonciation_retractation_le: new Date().toISOString() },
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

// Champ « Ajouter un code » (Mon compte, /abonnement) : accepte, à tout
// moment, une carte cadeau (YES-XXXX-XXXX), un code de parrainage (si le
// couple ne s'est pas inscrit avec) ou un code gratuit (Admin > Codes
// gratuits). Renvoie un message de confirmation à afficher.
export async function utiliserCode(code: string): Promise<{ error: string } | { success: true; message: string }> {
  const locale = await getLocale()
  const ctx = await getMonCoupleId()
  if ('error' in ctx) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const cleanCode = code.trim()
  if (!cleanCode) return { error: t(locale, 'Code requis', 'Code required') }

  const admin = createAdminClient()
  const { data: couple } = await admin.from('couples').select(`${ABONNEMENT_COLONNES}, code_parrainage, parrain_couple_id`).eq('id', ctx.coupleId).single()
  if (!couple) return { error: t(locale, 'Couple introuvable', 'Couple not found') }
  if (estCompteResilie(couple)) {
    return { error: t(locale, "Ce compte a été résilié : impossible d'utiliser un code sur cet espace.", 'This account was closed: a code cannot be redeemed on this space.') }
  }

  const rafraichir = () => {
    revalidatePath('/mon-compte')
    revalidatePath('/tableau-de-bord')
    revalidatePath('/abonnement')
  }

  // 1. Carte cadeau
  const codeCadeau = normaliserCodeCadeau(cleanCode)
  if (codeCadeau) {
    try {
      const res = await utiliserCarteCadeau(admin, codeCadeau, ctx.coupleId)
      if ('dureeMois' in res) {
        rafraichir()
        const euros = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: res.montantCentimes % 100 ? 2 : 0 }).format(res.montantCentimes / 100)
        const mois = t(locale, `${res.dureeMois} mois`, `${res.dureeMois} month${res.dureeMois > 1 ? 's' : ''}`)
        return {
          success: true,
          message: res.mode === 'credit_stripe'
            ? t(locale, `Carte cadeau activée : ${euros} déduits de vos prochains prélèvements.`, `Gift card activated: ${euros} deducted from your next payments.`)
            : res.mode === 'pack_initial' || estCarteYesBox(res.dureeMois)
            ? t(locale, 'Carte cadeau activée : votre pack initial YES BOX – Le Pacte est ouvert, avec un an pour le réaliser.', 'Gift card activated: your YES BOX – Le Pacte starter pack is open, with one year to complete it.')
            : t(locale, `Carte cadeau activée : ${mois} d’accès complet offert${res.dureeMois > 1 ? 's' : ''}.`, `Gift card activated: ${mois} of full access for free.`),
        }
      }
      if (res.erreur === 'deja_utilisee') return { error: t(locale, 'Cette carte cadeau a déjà été utilisée.', 'This gift card has already been used.') }
      if (res.erreur === 'expiree') return { error: t(locale, 'Cette carte cadeau a expiré (valable 1 an après l’achat).', 'This gift card has expired (valid for 1 year after purchase).') }
      // Code inconnu : on essaie encore les autres sortes de codes.
    } catch (err) {
      return { error: (err as Error).message }
    }
  }

  // 2. Code de parrainage (couple inscrit sans le code de son parrain)
  const { data: parrain } = await admin.from('couples').select('id').eq('code_parrainage', cleanCode.toUpperCase()).maybeSingle()
  if (parrain) {
    if (parrain.id === ctx.coupleId) return { error: t(locale, 'C’est votre propre code de parrainage : partagez-le avec d’autres couples !', 'This is your own referral code: share it with other couples!') }
    if (couple.parrain_couple_id) return { error: t(locale, 'Votre couple a déjà été parrainé.', 'Your couple already has a referrer.') }
    if (!(await enregistrerParrainage(admin, cleanCode, ctx.coupleId))) return { error: t(locale, 'Code invalide', 'Invalid code') }
    rafraichir()
    return { success: true, message: t(locale, 'Code de parrainage enregistré : merci, le couple qui vous a parrainés se rapproche de sa récompense !', 'Referral code saved: thank you, the couple who referred you is one step closer to their reward!') }
  }

  // 3. Code gratuit (Admin > Codes gratuits)
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

  rafraichir()
  if (data.offre === 'pack_initial') {
    return { success: true, message: t(locale, 'Code activé : votre pack initial YES BOX – Le Pacte est ouvert, avec un an pour le réaliser.', 'Code activated: your YES BOX – Le Pacte starter pack is open, with one year to complete it.') }
  }
  return { success: true, message: t(locale, 'Code activé : votre accès gratuit est ouvert.', 'Code activated: your free access is open.') }
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
