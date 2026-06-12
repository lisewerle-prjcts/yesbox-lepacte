'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function creerCouple(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const nomCouple = formData.get('nom_couple') as string
  const dateAnniversaire = formData.get('date_anniversaire') as string | null

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .insert({
      nom_couple: nomCouple || null,
      date_anniversaire: dateAnniversaire || null,
    })
    .select()
    .single()

  if (coupleError) return { error: coupleError.message }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ couple_id: couple.id, role: 'initiateur' })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  await supabase.rpc('initialiser_modules_couple', { p_couple_id: couple.id })

  revalidatePath('/tableau-de-bord')
  return { success: true, couple, inviteToken: couple.invite_token }
}

export async function rejoindreCouple(token: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase.rpc('rejoindre_couple_via_token', {
    p_token: token,
    p_user_id: user.id,
  })

  if (error) return { error: error.message }
  if (!data.success) return { error: data.error }

  revalidatePath('/tableau-de-bord')
  return { success: true }
}

export async function getInviteLink() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'Aucun couple trouvé' }

  const { data: couple } = await supabase
    .from('couples')
    .select('invite_token, invite_used')
    .eq('id', profile.couple_id)
    .single()

  if (!couple) return { error: 'Couple introuvable' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return {
    success: true,
    link: `${baseUrl}/rejoindre?token=${couple.invite_token}`,
    used: couple.invite_used,
  }
}
