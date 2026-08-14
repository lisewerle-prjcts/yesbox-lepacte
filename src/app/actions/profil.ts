'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfil(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const prenom = (formData.get('prenom') as string)?.trim()
  const nom = (formData.get('nom') as string)?.trim()

  if (!prenom) return { error: 'Le prénom est requis' }

  const { error } = await supabase
    .from('profiles')
    .update({ prenom, nom: nom || null })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profil', 'layout')
  return { success: true }
}

export async function updateCoupleAnniversaire(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'Aucun couple trouvé' }

  const dateAnniversaire = (formData.get('date_anniversaire') as string)?.trim() || null

  const { error } = await supabase
    .from('couples')
    .update({ date_anniversaire: dateAnniversaire })
    .eq('id', profile.couple_id)

  if (error) return { error: error.message }

  revalidatePath('/profil', 'layout')
  revalidatePath('/pacte')
  revalidatePath('/inviter-partenaire')
  return { success: true }
}
