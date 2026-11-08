import type { createAdminClient } from '@/lib/supabase/server'
import { ajouterMois, dateFinPassee } from '@/lib/dates'

type AdminClient = ReturnType<typeof createAdminClient>

// Codes de réduction (Admin > Codes gratuits, offre 'reduction') : un montant
// en euros déduit du prochain paiement du couple (plusieurs codes se cumulent) (pack initial, ou premier
// paiement du rendez-vous annuel). Montant, durée de validité et date de fin
// du code sont lus au moment du paiement ; la réduction est marquée utilisée par le
// webhook Stripe une fois le paiement reçu (cf. supabase/schema.sql).

export interface ReductionCode {
  /** Identifiants des utilisations, séparés par des virgules (métadonnée Stripe). */
  utilisationId: string
  /** Codes, séparés par « + ». */
  code: string
  montantCentimes: number
  expireLe: string | null
}

export function finReduction(utiliseLe: string, dureeMois: number | null): string | null {
  return dureeMois ? ajouterMois(new Date(utiliseLe), dureeMois) : null
}

// Codes de réduction cumulables : tous ceux que le couple a saisis, encore
// valables et pas encore utilisés, s'additionnent sur le prochain paiement.
export async function reductionDisponible(admin: AdminClient, coupleId: string): Promise<ReductionCode | null> {
  const { data } = await admin.from('codes_gratuits_utilisations')
    .select('id, utilise_le, reduction_utilisee_le, codes_gratuits(code, offre, montant_centimes, duree_mois, actif_jusqu_au)')
    .eq('couple_id', coupleId)
    .is('reduction_utilisee_le', null)
  type CodeLie = { code: string; offre: string; montant_centimes: number | null; duree_mois: number | null; actif_jusqu_au: string | null }
  const valables: { id: string; code: string; montant: number; expireLe: string | null }[] = []
  for (const u of data ?? []) {
    const lie = u.codes_gratuits as CodeLie | CodeLie[] | null
    const code = Array.isArray(lie) ? lie[0] : lie
    if (!code || code.offre !== 'reduction' || !code.montant_centimes || dateFinPassee(code.actif_jusqu_au)) continue
    const expireLe = finReduction(u.utilise_le, code.duree_mois)
    if (expireLe && new Date(expireLe).getTime() <= Date.now()) continue
    valables.push({ id: u.id, code: code.code, montant: code.montant_centimes, expireLe })
  }
  if (!valables.length) return null
  const fins = valables.map(v => v.expireLe).filter((d): d is string => !!d).sort()
  return {
    utilisationId: valables.map(v => v.id).join(','),
    code: valables.map(v => v.code).join(' + '),
    montantCentimes: valables.reduce((total, v) => total + v.montant, 0),
    expireLe: fins[0] ?? null,
  }
}

// Webhook Stripe, une fois le paiement reçu : chaque réduction ne sert qu'une
// fois (plusieurs identifiants possibles, séparés par des virgules).
export async function marquerReductionUtilisee(admin: AdminClient, utilisationId: string | undefined) {
  const ids = (utilisationId ?? '').split(',').map(id => id.trim()).filter(Boolean)
  if (!ids.length) return
  const { error } = await admin.from('codes_gratuits_utilisations')
    .update({ reduction_utilisee_le: new Date().toISOString() })
    .in('id', ids)
    .is('reduction_utilisee_le', null)
  if (error) throw new Error(error.message)
}
