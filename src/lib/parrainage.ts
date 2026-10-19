import type { createAdminClient } from '@/lib/supabase/server'
import { getStripe, PRIX_ABONNEMENT_MENSUEL_ID, PRIX_ABONNEMENT_ANNUEL_ID } from '@/lib/stripe'
import { ajouterMois } from '@/lib/dates'
import { estAbonnementActif } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'

type AdminClient = ReturnType<typeof createAdminClient>

export const FILLEULS_POUR_UN_MOIS_OFFERT = 5

// Un couple qui paie déjà activement via Stripe reçoit un crédit sur son
// compte client (appliqué automatiquement à sa prochaine facture) plutôt
// qu'une extension d'accès gratuit, qui ne l'empêcherait pas d'être
// prélevé par le renouvellement automatique en cours.
async function crediterMoisStripe(admin: AdminClient, stripeCustomerId: string, nbMois: number, description: string) {
  const stripe = getStripe()
  const price = PRIX_ABONNEMENT_MENSUEL_ID ? await stripe.prices.retrieve(PRIX_ABONNEMENT_MENSUEL_ID) : null
  const montant = price?.unit_amount ?? 2900
  const devise = price?.currency ?? 'eur'
  await stripe.customers.createBalanceTransaction(stripeCustomerId, {
    amount: -montant * nbMois,
    currency: devise,
    description: `${description} : ${nbMois} mois offert${nbMois > 1 ? 's' : ''}`,
  })
}

async function etendreAccesGratuit(admin: AdminClient, coupleId: string, nbMois: number) {
  const { data: couple } = await admin.from('couples')
    .select('acces_gratuit_expire_le, subscription_current_period_end')
    .eq('id', coupleId).single()

  const base = [couple?.acces_gratuit_expire_le, couple?.subscription_current_period_end]
    .map(d => (d ? new Date(d).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), Date.now())

  await admin.from('couples').update({ acces_gratuit_expire_le: ajouterMois(new Date(base), nbMois) }).eq('id', coupleId)
}

// Renvoie la façon dont les mois ont été accordés : crédit sur la prochaine
// facture Stripe, ou accès gratuit prolongé.
export async function accorderMoisGratuits(admin: AdminClient, coupleId: string, nbMois: number, description = 'Parrainage YES BOX'): Promise<'credit_stripe' | 'acces_gratuit'> {
  if (nbMois <= 0) return 'acces_gratuit'
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', coupleId).single()
  if (!couple) return 'acces_gratuit'

  // Abonnement dont le renouvellement est arrêté : un crédit ne servirait à
  // rien, l'accès gratuit prend le relais à la fin de la période payée.
  if (estAbonnementActif(couple) && !couple.subscription_cancel_at_period_end && couple.stripe_customer_id) {
    try {
      await crediterMoisStripe(admin, couple.stripe_customer_id, nbMois, description)
      return 'credit_stripe'
    } catch {
      // Si Stripe échoue (clé absente, etc.), on ne perd pas la récompense :
      // elle est accordée comme accès gratuit à la place.
    }
  }
  await etendreAccesGratuit(admin, coupleId, nbMois)
  return 'acces_gratuit'
}

// Parrain qui a signé son pacte (parcours initial terminé) : chaque palier
// de 5 filleuls lui offre 1 an au lieu d'1 mois. S'il paie déjà, crédit sur
// sa prochaine facture Stripe du prix d'une année de « Pacte – notre
// rendez-vous annuel » ; sinon, 12 mois d'accès gratuit en plus.
async function accorderAnneesOffertes(admin: AdminClient, coupleId: string, nbAnnees: number) {
  if (nbAnnees <= 0) return
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', coupleId).single()
  if (!couple) return

  if (estAbonnementActif(couple) && !couple.subscription_cancel_at_period_end && couple.stripe_customer_id) {
    try {
      const stripe = getStripe()
      const price = PRIX_ABONNEMENT_ANNUEL_ID ? await stripe.prices.retrieve(PRIX_ABONNEMENT_ANNUEL_ID) : null
      await stripe.customers.createBalanceTransaction(couple.stripe_customer_id, {
        amount: -(price?.unit_amount ?? 1900) * nbAnnees,
        currency: price?.currency ?? 'eur',
        description: `Parrainage YES BOX : ${nbAnnees} an${nbAnnees > 1 ? 's' : ''} offert${nbAnnees > 1 ? 's' : ''}`,
      })
      return
    } catch {
      // Si Stripe échoue, la récompense est accordée comme accès gratuit.
    }
  }
  await etendreAccesGratuit(admin, coupleId, 12 * nbAnnees)
}

// Rattache un couple qui vient de s'inscrire à son parrain (RPC atomique,
// cf. supabase/schema.sql v12) et accorde la récompense dès qu'un palier
// de 5 filleuls est franchi : 1 mois offert, ou 1 an si le parrain a signé
// son pacte. Best-effort : un code de parrainage invalide
// ne bloque jamais l'inscription. Renvoie true si le code était bien un
// code de parrainage valide.
export async function enregistrerParrainage(admin: AdminClient, codeParrainage: string, nouveauCoupleId: string): Promise<boolean> {
  const clean = codeParrainage.trim()
  if (!clean) return false

  const { data, error } = await admin.rpc('parrainer_couple', {
    p_code_parrainage: clean,
    p_nouveau_couple_id: nouveauCoupleId,
  })
  if (error || !data?.success) return false

  if (data.nouveaux_mois_offerts > 0) {
    const { data: parrain } = await admin.from('couples').select('pacte_signe_le').eq('id', data.parrain_couple_id).maybeSingle()
    if (parrain?.pacte_signe_le) await accorderAnneesOffertes(admin, data.parrain_couple_id, data.nouveaux_mois_offerts)
    else await accorderMoisGratuits(admin, data.parrain_couple_id, data.nouveaux_mois_offerts)
  }
  return true
}
