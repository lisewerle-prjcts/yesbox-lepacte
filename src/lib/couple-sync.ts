import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Répercute le prénom d'un profil sur le bon slot (prenom_partenaire1/2) du
 * couple auquel il appartient — ce slot est la source de vérité utilisée
 * pour nommer les modules 1 et 2, indépendamment de qui est connecté.
 */
export async function syncPrenomVersCouple(db: SupabaseClient, coupleId: string | null, role: string | null, prenom: string) {
  if (!coupleId || !role) return
  const champ = role === 'initiateur' ? 'prenom_partenaire1' : role === 'partenaire' ? 'prenom_partenaire2' : null
  if (!champ) return
  await db.from('couples').update({ [champ]: prenom }).eq('id', coupleId)
}
