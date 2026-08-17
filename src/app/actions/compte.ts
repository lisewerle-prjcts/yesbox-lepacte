'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function updateMesInfos(nom: string, prenom: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!prenom.trim()) return { error: 'Le prénom est requis' }

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!prenom.trim()) return { error: 'Le prénom est requis' }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: 'Aucun couple trouvé' }

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

export async function updateInfosCouple(nomCouple: string, dateAnniversaire: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: 'Aucun couple trouvé' }

  const { error } = await supabase
    .from('couples')
    .update({ nom_couple: nomCouple.trim() || null, date_anniversaire: dateAnniversaire || null })
    .eq('id', myProfile.couple_id)

  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  revalidatePath('/pacte')
  revalidatePath('/tableau-de-bord')
  return { success: true }
}

export async function changerMonMotDePasse(currentPassword: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Non authentifié' }
  if (newPassword.length < 8) return { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (reauthError) return { error: 'Mot de passe actuel incorrect' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}
