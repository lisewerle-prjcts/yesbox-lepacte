'use server'

import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { getStripe } from '@/lib/stripe'
import { estDureeCarteCadeau, prixCarteCadeauId } from '@/lib/cartes-cadeaux'

// Prénoms imprimés sur la carte : texte court, sans retour à la ligne.
function nettoyer(texte: string | undefined, max = 60) {
  return (texte ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

// Achat d'une carte cadeau (page /offrir) : paiement unique via Stripe
// Checkout, ouvert à tout le monde, avec ou sans compte. Le code est créé
// une fois le paiement confirmé (cf. enregistrerCarteCadeau).
export async function acheterCarteCadeau(choix: {
  dureeMois: number
  /** La personne qui achète fait partie du couple qui en profite. */
  pourSoi: boolean
  deLaPartDe?: string
  prenom1?: string
  prenom2?: string
  cgvAcceptees: boolean
}): Promise<{ url: string } | { error: string }> {
  const locale = await getLocale()
  if (!choix.cgvAcceptees) return { error: t(locale, 'Coche la case d’acceptation des CGV avant de payer.', 'Tick the box accepting the terms of sale before paying.') }
  if (!estDureeCarteCadeau(choix.dureeMois)) return { error: t(locale, 'Cette carte cadeau n’existe plus : rechargez la page.', 'This gift card no longer exists: reload the page.') }
  const prixId = prixCarteCadeauId(choix.dureeMois)
  if (!prixId) return { error: t(locale, "La carte cadeau YES BOX n'est pas encore configurée (STRIPE_PRICE_ID_CARTE_CADEAU_YESBOX manquant).", 'The YES BOX gift card is not configured yet (missing STRIPE_PRICE_ID_CARTE_CADEAU_YESBOX).') }

  // Personne connectée : son adresse est préremplie sur la page de paiement.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const prenoms = [nettoyer(choix.prenom1, 40), nettoyer(choix.prenom2, 40)].filter(Boolean)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const metadata = {
    type: 'carte_cadeau',
    duree_mois: String(choix.dureeMois),
    pour_soi: choix.pourSoi ? 'oui' : 'non',
    de_la_part_de: choix.pourSoi ? '' : nettoyer(choix.deLaPartDe),
    pour_qui: prenoms.join(' & '),
    langue: locale,
    cgv_acceptees_le: new Date().toISOString(),
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: prixId, quantity: 1 }],
      success_url: `${appUrl}/offrir/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/offrir?paiement=annule`,
      customer_email: user?.email ?? undefined,
      customer_creation: 'if_required',
      metadata,
      payment_intent_data: { metadata, description: 'Carte cadeau YES BOX' },
      locale,
    })
    if (!session.url) return { error: t(locale, 'Impossible de créer la session de paiement', 'Could not create the checkout session') }
    return { url: session.url }
  } catch (err) {
    return { error: t(locale, `Erreur Stripe : ${(err as Error).message}`, `Stripe error: ${(err as Error).message}`) }
  }
}
