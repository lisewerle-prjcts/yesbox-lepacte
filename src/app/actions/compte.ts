'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'

export async function updateMesInfos(nom: string, prenom: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (!prenom.trim()) return { error: t(locale, 'Le prénom est requis', 'First name is required') }

  const { error } = await supabase
    .from('profiles')
    .update({ nom: nom.trim() || null, prenom: prenom.trim() })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updatePrenomPartenaire(prenom: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (!prenom.trim()) return { error: t(locale, 'Le prénom est requis', 'First name is required') }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ prenom: prenom.trim() })
    .eq('couple_id', myProfile.couple_id)
    .neq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateNomCouple(nomCouple: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

  // Client admin : la même mise à jour via le client authentifié échoue
  // silencieusement sous RLS (cf. creerCouple dans couple.ts).
  const admin = createAdminClient()
  const { error } = await admin
    .from('couples')
    .update({ nom_couple: nomCouple.trim() || null })
    .eq('id', myProfile.couple_id)

  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  revalidatePath('/tableau-de-bord')
  return { success: true }
}

export async function updateDateAnniversaire(dateAnniversaire: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

  const { error } = await supabase
    .from('couples')
    .update({ date_anniversaire: dateAnniversaire || null })
    .eq('id', myProfile.couple_id)

  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  revalidatePath('/pacte')
  revalidatePath('/tableau-de-bord')
  return { success: true }
}

export async function changerMonMotDePasse(currentPassword: string, newPassword: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (newPassword.length < 8) return { error: t(locale, 'Le nouveau mot de passe doit contenir au moins 8 caractères', 'The new password must be at least 8 characters') }

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (reauthError) return { error: t(locale, 'Mot de passe actuel incorrect', 'Current password is incorrect') }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}
