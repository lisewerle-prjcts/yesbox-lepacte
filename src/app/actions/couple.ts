'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { consentementManquant } from '@/lib/consentement'
import { rejoindreCoupleParCode } from '@/lib/couple-join'
import { ouvrirPremierModuleSiBesoin, MODULE_PACTE, MODULE_RDV_ANNUEL } from '@/lib/progression'
import { bornesRdvAnnuel } from '@/lib/rdv-annuel'

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
  await ouvrirPremierModuleSiBesoin(admin, couple.id)
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

// Signature du pacte, dès la fin du module 9 : fixe la date du rendez-vous
// annuel, à laquelle le module 10 se débloque. Tant que le module 10 n'est
// pas ouvert, la date peut encore être changée (même action).
export async function signerPacte(dateRdvAnnuel: string) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

  const [{ data: pacte }, { data: rdv }, { data: couple }] = await Promise.all([
    admin.from('modules').select('revealed').eq('couple_id', profile.couple_id).eq('slug', MODULE_PACTE).maybeSingle(),
    admin.from('modules').select('statut, revealed').eq('couple_id', profile.couple_id).eq('slug', MODULE_RDV_ANNUEL).maybeSingle(),
    admin.from('couples').select('pacte_signe_le').eq('id', profile.couple_id).single(),
  ])
  if (!pacte?.revealed) return { error: t(locale, 'Le pacte se signe une fois le module 9 terminé.', 'The pact can be signed once module 9 is complete.') }
  if (rdv && (rdv.statut !== 'locked' || rdv.revealed)) return { error: t(locale, 'Votre rendez-vous annuel est déjà ouvert.', 'Your yearly date is already open.') }

  const { min, max } = bornesRdvAnnuel()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRdvAnnuel) || dateRdvAnnuel < min || dateRdvAnnuel > max) {
    return { error: t(locale, 'Choisis une date entre 6 mois et 1 an à partir d’aujourd’hui.', 'Pick a date between 6 months and 1 year from today.') }
  }

  const { error } = await admin.from('couples').update({
    rdv_annuel_le: dateRdvAnnuel,
    ...(couple?.pacte_signe_le ? {} : { pacte_signe_le: new Date().toISOString(), pacte_signe_par: user.id }),
  }).eq('id', profile.couple_id)
  if (error) return { error: error.message }

  revalidatePath('/journal')
  revalidatePath('/tableau-de-bord')
  return { success: true }
}
