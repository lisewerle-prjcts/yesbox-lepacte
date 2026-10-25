import type Stripe from 'stripe'
import type { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { ajouterMois } from '@/lib/dates'
import { DUREE_MOIS_YESBOX } from '@/lib/abonnement'

type AdminClient = ReturnType<typeof createAdminClient>

// Pack initial YES BOX – Le Pacte (58 €, paiement unique) : modules 2 à 9,
// jusqu'au pacte, avec 1 an pour les réaliser (couples.pack_initial_expire_le,
// cf. supabase/schema.sql). Le module « Notre rendez-vous annuel » demande en
// plus l'abonnement annuel à 19 €/an, facultatif.

// Ouvre (ou prolonge) le pack d'un couple : fin = date de départ + 12 mois,
// sans jamais raccourcir un pack déjà plus long. Idempotent pour une même
// date de départ.
export async function ouvrirPackInitial(admin: AdminClient, coupleId: string, depuis: Date) {
  const fin = ajouterMois(depuis, DUREE_MOIS_YESBOX)
  const { data: couple, error } = await admin.from('couples').select('pack_initial_expire_le').eq('id', coupleId).single()
  if (error) throw new Error(error.message)
  if (couple?.pack_initial_expire_le && new Date(couple.pack_initial_expire_le).getTime() >= new Date(fin).getTime()) return
  const { error: majError } = await admin.from('couples').update({ pack_initial_expire_le: fin }).eq('id', coupleId)
  if (majError) throw new Error(majError.message)
}

// Carte cadeau du pack initial : un an à partir de l'activation, ajouté
// après un pack encore en cours.
export async function offrirPackInitial(admin: AdminClient, coupleId: string) {
  const { data: couple } = await admin.from('couples').select('pack_initial_expire_le').eq('id', coupleId).single()
  const enCours = couple?.pack_initial_expire_le ? new Date(couple.pack_initial_expire_le).getTime() : 0
  await ouvrirPackInitial(admin, coupleId, new Date(Math.max(enCours, Date.now())))
}

// Achat payé (session Stripe Checkout, metadata.type = 'pack_initial') :
// appelé par le webhook et par la page de retour du paiement, le premier des
// deux ouvre le pack. Renvoie l'identifiant du couple, ou null si la session
// n'est pas un achat de pack payé.
export async function enregistrerPackInitial(admin: AdminClient, session: Stripe.Checkout.Session): Promise<string | null> {
  if (session.metadata?.type !== 'pack_initial' || session.payment_status !== 'paid') return null
  const coupleId = session.metadata.couple_id
  if (!coupleId) return null
  await ouvrirPackInitial(admin, coupleId, new Date(session.created * 1000))
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (customerId) await admin.from('couples').update({ stripe_customer_id: customerId }).eq('id', coupleId).is('stripe_customer_id', null)
  return coupleId
}

// Crédit de parrainage disponible sur le compte client Stripe (solde
// négatif), en centimes. Les abonnements le déduisent tout seuls de leurs
// factures ; un paiement unique ne le fait pas : il est appliqué au pack par
// une réduction, puis retiré du solde une fois le paiement reçu.
export async function creditDisponible(customerId: string): Promise<number> {
  const customer = await getStripe().customers.retrieve(customerId)
  if (customer.deleted) return 0
  return Math.max(0, -(customer.balance ?? 0))
}

export async function reductionCredit(montantCentimes: number): Promise<string> {
  const coupon = await getStripe().coupons.create({
    amount_off: montantCentimes,
    currency: 'eur',
    duration: 'once',
    max_redemptions: 1,
    name: 'Crédit parrainage YES BOX',
  })
  return coupon.id
}

// Retire du solde le crédit utilisé pour le pack (webhook, une seule fois).
export async function consommerCredit(customerId: string, montantCentimes: number) {
  if (montantCentimes <= 0) return
  await getStripe().customers.createBalanceTransaction(customerId, {
    amount: montantCentimes,
    currency: 'eur',
    description: 'Crédit parrainage utilisé pour le pack initial YES BOX – Le Pacte',
  })
}
