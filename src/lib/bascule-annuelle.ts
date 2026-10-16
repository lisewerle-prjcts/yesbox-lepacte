import { createAdminClient } from '@/lib/supabase/server'
import { getStripe, PRIX_ABONNEMENT_ANNUEL_ID } from '@/lib/stripe'
import { estAbonnementActif } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'

type AdminClient = ReturnType<typeof createAdminClient>

export type ResultatBascule =
  | { basculeLe: string }
  | { raison: 'non_configure' | 'sans_mensuel' | 'deja_annuel' | 'deja_programme' | 'arret_demande' }

// Programme la bascule de l'abonnement mensuel Stripe vers « Pacte – notre
// rendez-vous annuel » (19 €/an) à la fin du mois déjà payé (subscription
// schedule). Rien ne change d'ici là ; à cette date, les 19 € sont prélevés
// sur la carte enregistrée et une période d'un an commence.
// reprendreSiArret : un arrêt du renouvellement demandé sur le mensuel est
// levé (bascule validée par le couple). Sans cette option, un couple qui a
// demandé l'arrêt garde son choix : rien n'est programmé.
export async function programmerBasculeAnnuelle(
  admin: AdminClient, coupleId: string, { reprendreSiArret = false }: { reprendreSiArret?: boolean } = {},
): Promise<ResultatBascule> {
  if (!PRIX_ABONNEMENT_ANNUEL_ID) return { raison: 'non_configure' }
  const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', coupleId).single()
  if (!couple?.stripe_subscription_id || !estAbonnementActif(couple)) return { raison: 'sans_mensuel' }

  const stripe = getStripe()
  let actuel = await stripe.subscriptions.retrieve(couple.stripe_subscription_id)
  const item = actuel.items.data[0]
  if (!item) return { raison: 'sans_mensuel' }
  if (item.price.id === PRIX_ABONNEMENT_ANNUEL_ID) return { raison: 'deja_annuel' }
  if (actuel.schedule) return { raison: 'deja_programme' }

  // Un planning ne peut pas reprendre un abonnement dont l'arrêt est
  // demandé : la bascule vaut reprise du renouvellement.
  if (actuel.cancel_at_period_end) {
    if (!reprendreSiArret) return { raison: 'arret_demande' }
    actuel = await stripe.subscriptions.update(actuel.id, { cancel_at_period_end: false })
  }

  const schedule = await stripe.subscriptionSchedules.create({ from_subscription: actuel.id })
  const phaseEnCours = schedule.phases[0]
  // Échec de la programmation : on libère le planning, le mensuel
  // continue sans changement.
  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    metadata: { couple_id: coupleId, formule: 'annuel' },
    phases: [
      {
        items: [{ price: item.price.id, quantity: 1 }],
        start_date: phaseEnCours.start_date,
        end_date: phaseEnCours.end_date,
      },
      {
        items: [{ price: PRIX_ABONNEMENT_ANNUEL_ID, quantity: 1 }],
        duration: { interval: 'year', interval_count: 1 },
        proration_behavior: 'none',
      },
    ],
  }).catch(async err => {
    await stripe.subscriptionSchedules.release(schedule.id).catch(() => {})
    throw err
  })

  const basculeLe = new Date(phaseEnCours.end_date * 1000).toISOString()
  await admin.from('couples').update({
    subscription_cancel_at_period_end: false,
    subscription_canceled_at: null,
  }).eq('id', coupleId)
  await admin.from('couples').update({ subscription_annuel_prevu_le: basculeLe }).eq('id', coupleId)
  return { basculeLe }
}
