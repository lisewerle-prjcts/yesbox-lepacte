import type { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { ajouterMois } from '@/lib/dates'
import { estAbonnementActif } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'

type AdminClient = ReturnType<typeof createAdminClient>

export const FILLEULS_PAR_RECOMPENSE = 5
// Récompense de chaque palier de 5 filleuls : 10 € déduits des prochains
// paiements Stripe du parrain (les 58 € de la YES BOX s'il ne l'a pas encore
// prise, sinon ses renouvellements à 19 €).
export const REDUCTION_PARRAINAGE_CENTIMES = 1000

// Crédit sur le solde du compte client Stripe : déduit automatiquement des
// prochaines factures (achat de la YES BOX, renouvellements annuels).
async function crediterStripe(stripeCustomerId: string, montantCentimes: number, devise: string, description: string) {
  await getStripe().customers.createBalanceTransaction(stripeCustomerId, {
    amount: -montantCentimes,
    currency: devise,
    description,
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

// Mois offerts par une carte cadeau. Un couple qui paie déjà activement via
// Stripe reçoit un crédit du montant de la carte sur son compte client
// (déduit automatiquement de ses prochains prélèvements) plutôt qu'une
// extension d'accès gratuit, qui ne l'empêcherait pas d'être prélevé par le
// renouvellement automatique en cours. Renvoie la façon dont les mois ont été
// accordés : crédit sur les prochaines factures Stripe, ou accès gratuit
// prolongé.
export async function accorderMoisGratuits(admin: AdminClient, coupleId: string, nbMois: number, credit: { centimes: number; devise: string }, description: string): Promise<'credit_stripe' | 'acces_gratuit'> {
  if (nbMois <= 0) return 'acces_gratuit'
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', coupleId).single()
  if (!couple) return 'acces_gratuit'

  // Abonnement dont le renouvellement est arrêté : un crédit ne servirait à
  // rien, l'accès gratuit prend le relais à la fin de la période payée.
  if (estAbonnementActif(couple) && !couple.subscription_cancel_at_period_end && couple.stripe_customer_id) {
    try {
      await crediterStripe(couple.stripe_customer_id, credit.centimes, credit.devise, description)
      return 'credit_stripe'
    } catch {
      // Si Stripe échoue (clé absente, etc.), la carte n'est pas perdue :
      // elle est accordée comme accès gratuit à la place.
    }
  }
  await etendreAccesGratuit(admin, coupleId, nbMois)
  return 'acces_gratuit'
}

// Récompense de parrainage : 10 € par palier franchi, crédités sur le compte
// client Stripe du parrain (créé au besoin, avec l'adresse d'un membre du
// couple) et déduits de ses prochains paiements.
async function accorderReductionParrainage(admin: AdminClient, coupleId: string, nbPaliers: number) {
  if (nbPaliers <= 0) return
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', coupleId).single()
  if (!couple) return

  let customerId = couple.stripe_customer_id
  if (!customerId) {
    const { data: membre } = await admin.from('profiles').select('email').eq('couple_id', coupleId).not('email', 'is', null).limit(1).maybeSingle()
    const customer = await getStripe().customers.create({
      email: membre?.email ?? undefined,
      metadata: { couple_id: coupleId },
    })
    customerId = customer.id
    await admin.from('couples').update({ stripe_customer_id: customerId }).eq('id', coupleId)
  }
  const montant = REDUCTION_PARRAINAGE_CENTIMES * nbPaliers
  await crediterStripe(customerId, montant, 'eur', `Parrainage YES BOX : ${montant / 100} € de réduction`)
}

// Rattache un couple qui vient de s'inscrire à son parrain (RPC atomique,
// cf. supabase/schema.sql v12) et accorde la récompense dès qu'un palier
// de 5 filleuls est franchi : 10 € déduits des prochains paiements Stripe
// du parrain. Best-effort : un code de parrainage invalide
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

  // nouveaux_mois_offerts : nombre de paliers de 5 filleuls franchis (nom
  // hérité de l'ancienne récompense d'un mois offert).
  if (data.nouveaux_mois_offerts > 0) {
    try {
      await accorderReductionParrainage(admin, data.parrain_couple_id, data.nouveaux_mois_offerts)
    } catch (e) {
      // Le palier est déjà compté (parrainages_recompenses) : la réduction
      // est à créditer à la main dans Stripe si l'appel échoue.
      console.error(`[parrainage] réduction de ${REDUCTION_PARRAINAGE_CENTIMES * data.nouveaux_mois_offerts / 100} € non créditée au couple ${data.parrain_couple_id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return true
}
