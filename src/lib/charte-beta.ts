import type { createAdminClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

// Bêta d'octobre-novembre 2026 : le code gratuit BETANLR26 (Admin > Codes
// gratuits) est réservé aux couples testeurs, qui doivent accepter la charte
// de participation (/charte-beta). Chaque partenaire l'accepte : à
// l'inscription quand le code est saisi, sinon (partenaire qui rejoint le
// couple avec le code couple) au premier passage dans l'espace couple.
export const CODE_CHARTE_BETA = 'BETANLR26'

export function estCodeCharteBeta(code: string | null | undefined): boolean {
  return (code ?? '').trim().toUpperCase() === CODE_CHARTE_BETA
}

type ProfilCharte = { couple_id?: string | null; charte_beta_acceptee_le?: string | null } | null | undefined

// Tolérant : si la colonne charte_beta_acceptee_le manque encore en base
// (profil chargé avec select('*')), personne n'est bloqué.
export async function charteBetaManquante(admin: AdminClient, profile: ProfilCharte): Promise<boolean> {
  if (!profile?.couple_id || !('charte_beta_acceptee_le' in profile) || profile.charte_beta_acceptee_le) return false
  const { data } = await admin
    .from('codes_gratuits_utilisations')
    .select('codes_gratuits(code)')
    .eq('couple_id', profile.couple_id)
    .maybeSingle()
  const lie = data?.codes_gratuits as { code?: string } | { code?: string }[] | null | undefined
  const code = Array.isArray(lie) ? lie[0]?.code : lie?.code
  return estCodeCharteBeta(code)
}
