'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { consentementManquant } from '@/lib/consentement'
import { rejoindreCoupleParCode } from '@/lib/couple-join'

export async function creerCouple(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const locale = await getLocale()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

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

export async function rejoindreCouple(token: string) {
  const supabase = await createClient()
  const locale = await getLocale()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { data, error } = await createAdminClient().rpc('rejoindre_couple_via_token', {
    p_token: token,
    p_user_id: user.id,
  })

  if (error) return { error: error.message }
  if (!data.success) return { error: data.error }

  revalidatePath('/tableau-de-bord')
  return { success: true }
}

export async function rejoindrePartenaireParCode(formData: FormData) {
  const supabase = await createClient()
  const locale = await getLocale()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const code = formData.get('code') as string
  const result = await rejoindreCoupleParCode(user.id, code)
  if (result.success) revalidatePath('/tableau-de-bord')
  return result
}

export async function enregistrerPacteTexte(texte: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (await consentementManquant(supabase, user.id)) return { error: t(locale, 'Ton consentement est nécessaire pour enregistrer tes réponses.', 'Your consent is required to save your answers.') }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

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
  const locale = await getLocale()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

  const { data: couple } = await supabase
    .from('couples')
    .select('invite_token, invite_used, pairing_code, date_anniversaire')
    .eq('id', profile.couple_id)
    .single()

  if (!couple) return { error: t(locale, 'Couple introuvable', 'Couple not found') }

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
