'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function creerCouple(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const nomCouple = formData.get('nom_couple') as string
  const dateAnniversaire = formData.get('date_anniversaire') as string | null

  // Utilise le client admin pour bypasser la RLS sur couples
  const { data: couple, error: coupleError } = await admin
    .from('couples')
    .insert({
      nom_couple: nomCouple || null,
      date_anniversaire: dateAnniversaire || null,
    })
    .select()
    .single()

  if (coupleError) return { error: coupleError.message }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ couple_id: couple.id, role: 'initiateur' })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  await admin.rpc('initialiser_modules_couple', { p_couple_id: couple.id })
  await admin.rpc('renumeroter_couples')

  revalidatePath('/tableau-de-bord')
  return { success: true, couple, inviteToken: couple.invite_token }
}

export async function creerCoupleSolo(userId: string) {
  const admin = createAdminClient()

  const { data: couple, error: coupleError } = await admin
    .from('couples')
    .insert({})
    .select()
    .single()

  if (coupleError) return { error: coupleError.message }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ couple_id: couple.id, role: 'initiateur' })
    .eq('id', userId)

  if (profileError) return { error: profileError.message }

  await admin.rpc('initialiser_modules_couple', { p_couple_id: couple.id })
  await admin.rpc('renumeroter_couples')

  return { success: true, couple }
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

export async function rejoindreCoupleParCode(userId: string, code: string) {
  const supabase = await createClient()

  const cleanCode = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{5}$/.test(cleanCode)) {
    return { error: 'Le code doit contenir 5 lettres/chiffres' }
  }

  const { data, error } = await supabase.rpc('rejoindre_couple_via_code', {
    p_code: cleanCode,
    p_user_id: userId,
  })

  if (error) return { error: error.message }
  if (!data.success) return { error: data.error }

  revalidatePath('/tableau-de-bord')
  return { success: true, coupleId: data.couple_id }
}

export async function rejoindrePartenaireParCode(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const code = formData.get('code') as string
  return rejoindreCoupleParCode(user.id, code)
}

export async function enregistrerPacteTexte(texte: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'Aucun couple trouvé' }

  const { error } = await supabase
    .from('couples')
    .update({ pacte_texte: texte, pacte_modifie_par: user.id, pacte_modifie_le: new Date().toISOString() })
    .eq('id', profile.couple_id)

  if (error) return { error: error.message }
  revalidatePath('/pacte')
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
    .select('invite_token, invite_used, pairing_code, date_anniversaire')
    .eq('id', profile.couple_id)
    .single()

  if (!couple) return { error: 'Couple introuvable' }

  const { count: memberCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', profile.couple_id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return {
    success: true,
    link: `${baseUrl}/rejoindre?token=${couple.invite_token}`,
    used: couple.invite_used,
    pairingCode: couple.pairing_code,
    dateAnniversaire: couple.date_anniversaire,
    paired: (memberCount ?? 0) >= 2,
  }
}
