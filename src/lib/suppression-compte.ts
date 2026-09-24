import type { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

type AdminClient = ReturnType<typeof createAdminClient>

// Supprime définitivement un compte : l'utilisateur Supabase (ce qui efface
// en cascade son profil, ses réponses et ses conclusions), puis le couple
// s'il n'y reste plus personne. Dans ce cas, l'abonnement Stripe encore en
// cours est arrêté immédiatement pour ne plus être prélevé. Le client Stripe
// (factures) est conservé : les factures relèvent d'une obligation légale de
// conservation comptable.
//
// Ne vérifie aucun droit : à appeler uniquement depuis le serveur, après
// avoir authentifié la personne (Mon compte), vérifié le rôle admin, ou
// depuis la tâche de purge.
export async function supprimerCompte(admin: AdminClient, userId: string): Promise<{ error?: string }> {
  const { data: profile } = await admin.from('profiles').select('couple_id').eq('id', userId).single()
  const coupleId = profile?.couple_id ?? null

  let coupleVide = false
  let subscriptionId: string | null = null
  if (coupleId) {
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('couple_id', coupleId).neq('id', userId)
    coupleVide = !count
    if (coupleVide) {
      const { data: couple } = await admin.from('couples').select('stripe_subscription_id, subscription_status').eq('id', coupleId).single()
      if (couple?.stripe_subscription_id && couple.subscription_status === 'actif') subscriptionId = couple.stripe_subscription_id
    }
  }

  if (subscriptionId) {
    try {
      await getStripe().subscriptions.cancel(subscriptionId)
    } catch (err) {
      return { error: `Impossible d'arrêter l'abonnement Stripe : ${(err as Error).message}` }
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  if (coupleId && coupleVide) {
    await admin.from('couples').delete().eq('id', coupleId)
  }
  return {}
}
