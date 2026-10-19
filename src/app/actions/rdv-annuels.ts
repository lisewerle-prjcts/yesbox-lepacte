'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { chiffrer } from '@/lib/chiffrement'
import { moisDepuis } from '@/lib/rappels-email'

const LONGUEUR_MAX = 4000

// Réponse d'un membre du couple à la question d'un mois écoulé depuis la
// signature du pacte (page /rdv-annuels). Écrite par le serveur, chiffrée.
export async function enregistrerReponseMois(mois: number, valeur: string): Promise<{ error?: string }> {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: t(locale, 'Couple introuvable', 'Couple not found') }
  const { data: couple } = await admin.from('couples').select('pacte_signe_le').eq('id', profile.couple_id).single()
  if (!couple?.pacte_signe_le) return { error: t(locale, 'Les questions du mois commencent une fois votre pacte signé.', 'Monthly questions start once your pact is signed.') }

  const moisEcoules = moisDepuis(new Date(couple.pacte_signe_le), new Date())
  if (!Number.isInteger(mois) || mois < 1 || mois > moisEcoules) return { error: t(locale, 'Mois invalide', 'Invalid month') }

  const texte = valeur.trim().slice(0, LONGUEUR_MAX)
  const { error } = await admin.from('rdv_reponses_mois').upsert(
    { couple_id: profile.couple_id, user_id: user.id, mois, valeur: texte ? chiffrer(texte) : null, updated_at: new Date().toISOString() },
    { onConflict: 'couple_id,user_id,mois' },
  )
  if (error) return { error: error.message }
  revalidatePath('/rdv-annuels')
  return {}
}
