import type { createAdminClient } from '@/lib/supabase/server'
import { getStripe, PRIX_ABONNEMENT_MENSUEL_ID } from '@/lib/stripe'
import { ajouterMois } from '@/lib/dates'
import { estAbonnementActif } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'

type AdminClient = ReturnType<typeof createAdminClient>

export const FILLEULS_POUR_UN_MOIS_OFFERT = 5

// Un couple qui paie déjà activement via Stripe reçoit un crédit sur son
// compte client (appliqué automatiquement à sa prochaine facture) plutôt
// qu'une extension d'accès gratuit, qui ne l'empêcherait pas d'être
// prélevé par le renouvellement automatique en cours.
async function crediterMoisStripe(admin: AdminClient, stripeCustomerId: string, nbMois: number) {
  const stripe = getStripe()
  const price = PRIX_ABONNEMENT_MENSUEL_ID ? await stripe.prices.retrieve(PRIX_ABONNEMENT_MENSUEL_ID) : null
  const montant = price?.unit_amount ?? 2900
  const devise = price?.currency ?? 'eur'
  await stripe.customers.createBalanceTransaction(stripeCustomerId, {
    amount: -montant * nbMois,
    currency: devise,
    description: `Parrainage YES BOX : ${nbMois} mois offert${nbMois > 1 ? 's' : ''}`,
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

export async function accorderMoisGratuits(admin: AdminClient, coupleId: string, nbMois: number) {
  if (nbMois <= 0) return
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', coupleId).single()
  if (!couple) return

  if (estAbonnementActif(couple) && couple.stripe_customer_id) {
    try {
      await crediterMoisStripe(admin, couple.stripe_customer_id, nbMois)
      return
    } catch {
      // Si Stripe échoue (clé absente, etc.), on ne perd pas la récompense :
      // elle est accordée comme accès gratuit à la place.
    }
  }
  await etendreAccesGratuit(admin, coupleId, nbMois)
}

// Rattache un couple qui vient de s'inscrire à son parrain (RPC atomique,
// cf. supabase/schema.sql v12) et accorde la récompense dès qu'un palier
// de 5 filleuls est franchi. Best-effort : un code de parrainage invalide
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
    await accorderMoisGratuits(admin, data.parrain_couple_id, data.nouveaux_mois_offerts)
  }
  return true
}
