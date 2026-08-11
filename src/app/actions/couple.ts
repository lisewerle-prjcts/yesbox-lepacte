'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getEffectiveSession } from '@/lib/effective-session'
import { syncPrenomVersCouple } from '@/lib/couple-sync'

export async function creerCouple(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const nomCouple = formData.get('nom_couple') as string
  const dateAnniversaire = formData.get('date_anniversaire') as string | null

  const { data: monProfil } = await admin.from('profiles').select('prenom').eq('id', user.id).single()

  // Utilise le client admin pour bypasser la RLS sur couples
  const { data: couple, error: coupleError } = await admin
    .from('couples')
    .insert({
      nom_couple: nomCouple || null,
      date_anniversaire: dateAnniversaire || null,
      prenom_partenaire1: monProfil?.prenom || null,
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

  const { data: monProfil } = await supabase.from('profiles').select('prenom').eq('id', user.id).single()
  if (monProfil?.prenom) await syncPrenomVersCouple(supabase, data.couple_id, 'partenaire', monProfil.prenom)

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

export async function modifierReglages(formData: FormData) {
  const session = await getEffectiveSession()
  if (!session) return { error: 'Non authentifié' }

  const prenom = (formData.get('prenom') as string || '').trim()
  const nomCouple = (formData.get('nom_couple') as string || '').trim()
  const dateAnniversaire = formData.get('date_anniversaire') as string | null

  if (prenom.length < 2) return { error: 'Le prénom doit contenir au moins 2 caractères' }

  const { error: profileError } = await session.db
    .from('profiles').update({ prenom }).eq('id', session.userId)
  if (profileError) return { error: profileError.message }

  if (session.profile.couple_id) {
    const { error: coupleError } = await session.db
      .from('couples')
      .update({ nom_couple: nomCouple || null, date_anniversaire: dateAnniversaire || null })
      .eq('id', session.profile.couple_id)
    if (coupleError) return { error: coupleError.message }

    await syncPrenomVersCouple(session.db, session.profile.couple_id, session.profile.role, prenom)
  }

  revalidatePath('/reglages')
  revalidatePath('/tableau-de-bord')
  return { success: true }
}
