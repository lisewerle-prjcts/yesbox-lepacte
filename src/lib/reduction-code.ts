import type { createAdminClient } from '@/lib/supabase/server'
import { ajouterMois } from '@/lib/dates'

type AdminClient = ReturnType<typeof createAdminClient>

// Codes de réduction (Admin > Codes gratuits, offre 'reduction') : un montant
// en euros déduit du prochain paiement du couple (pack initial, ou premier
// paiement du rendez-vous annuel). Montant et durée de validité sont lus sur
// le code au moment du paiement ; la réduction est marquée utilisée par le
// webhook Stripe une fois le paiement reçu (cf. supabase/schema.sql).

export interface ReductionCode {
  utilisationId: string
  code: string
  montantCentimes: number
  expireLe: string | null
}

export function finReduction(utiliseLe: string, dureeMois: number | null): string | null {
  return dureeMois ? ajouterMois(new Date(utiliseLe), dureeMois) : null
}

export async function reductionDisponible(admin: AdminClient, coupleId: string): Promise<ReductionCode | null> {
  const { data } = await admin.from('codes_gratuits_utilisations')
    .select('id, utilise_le, reduction_utilisee_le, codes_gratuits(code, offre, montant_centimes, duree_mois)')
    .eq('couple_id', coupleId)
    .maybeSingle()
  if (!data || data.reduction_utilisee_le) return null
  const lie = data.codes_gratuits as { code: string; offre: string; montant_centimes: number | null; duree_mois: number | null } | { code: string; offre: string; montant_centimes: number | null; duree_mois: number | null }[] | null
  const code = Array.isArray(lie) ? lie[0] : lie
  if (!code || code.offre !== 'reduction' || !code.montant_centimes) return null
  const expireLe = finReduction(data.utilise_le, code.duree_mois)
  if (expireLe && new Date(expireLe).getTime() <= Date.now()) return null
  return { utilisationId: data.id, code: code.code, montantCentimes: code.montant_centimes, expireLe }
}

// Webhook Stripe, une fois le paiement reçu : la réduction ne sert qu'une fois.
export async function marquerReductionUtilisee(admin: AdminClient, utilisationId: string | undefined) {
  if (!utilisationId) return
  const { error } = await admin.from('codes_gratuits_utilisations')
    .update({ reduction_utilisee_le: new Date().toISOString() })
    .eq('id', utilisationId)
    .is('reduction_utilisee_le', null)
  if (error) throw new Error(error.message)
}
