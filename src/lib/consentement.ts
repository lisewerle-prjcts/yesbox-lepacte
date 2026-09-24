import type { createClient } from '@/lib/supabase/server'

type ProfilConsentement = {
  age_minimum_certifie_le?: string | null
  consentement_donnees_sensibles_le?: string | null
} | null | undefined

// Consentement RGPD (art. 9) et âge minimum (15 ans), recueillis à
// l'inscription ou, pour les comptes créés avant, sur /consentement.
export function aDonneSonConsentement(profile: ProfilConsentement): boolean {
  return !!profile?.age_minimum_certifie_le && !!profile?.consentement_donnees_sensibles_le
}

// Pour les actions serveur qui enregistrent du contenu (réponses,
// conclusions, pacte) : aucune donnée sensible sans consentement.
export async function consentementManquant(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('age_minimum_certifie_le, consentement_donnees_sensibles_le')
    .eq('id', userId)
    .single()
  return !aDonneSonConsentement(data)
}
