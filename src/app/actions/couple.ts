'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t, isLocale, type Locale } from '@/lib/i18n/locale'
import { rejoindreCoupleParCode } from '@/lib/couple-join'
import { ouvrirPremierModuleSiBesoin, MODULE_PACTE, MODULE_RDV_ANNUEL } from '@/lib/progression'
import { bornesRdvAnnuel, estDateValide } from '@/lib/rdv-annuel'
import { mailConfigure } from '@/lib/mailer'
import { envoyerModele } from '@/lib/modeles-email/serveur'
import { adresseConfirmee } from '@/lib/adresse-confirmee'

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
  if (!pacte?.revealed) return { error: t(locale, 'Le pacte se signe une fois le module du pacte terminé.', 'The pact can be signed once the pact module is complete.') }
  if (rdv && (rdv.statut !== 'locked' || rdv.revealed)) return { error: t(locale, 'Votre rendez-vous annuel est déjà ouvert.', 'Your yearly date is already open.') }

  const { min, max } = bornesRdvAnnuel()
  if (!estDateValide(dateRdvAnnuel) || dateRdvAnnuel < min || dateRdvAnnuel > max) {
    return { error: t(locale, 'Choisis une date entre 6 et 18 mois à partir d’aujourd’hui.', 'Pick a date between 6 and 18 months from today.') }
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

const INVITATIONS_PAR_JOUR = 3

// Envoie au ou à la partenaire un e-mail d'invitation avec le lien pour
// rejoindre le couple et le code de pairage, dans la langue choisie par la
// personne qui invite (par défaut, celle de son site). Limité à 3 envois par
// jour et par couple.
export async function envoyerInvitationPartenaire(email: string, langueInvitation?: Locale) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  // Sans adresse vérifiée, n'importe qui pourrait faire partir des e-mails
  // de chez nous vers n'importe quelle adresse.
  if (!adresseConfirmee(user)) {
    return { error: t(locale, 'Confirme d’abord ton adresse e-mail (lien reçu à l’inscription), puis tu pourras inviter ton/ta partenaire. Tu peux aussi lui partager le lien ou le code directement.', 'Please confirm your email address first (link sent when you signed up), then you can invite your partner. You can also share the link or code with them directly.') }
  }

  const destinataire = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinataire) || destinataire.length > 254) {
    return { error: t(locale, 'Adresse e-mail invalide', 'Invalid email address') }
  }
  if (!mailConfigure()) return { error: t(locale, "L'envoi d'e-mails n'est pas configuré.", 'Email sending is not configured.') }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('couple_id, prenom, email').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }
  if (destinataire === (profile.email ?? '').toLowerCase()) {
    return { error: t(locale, 'Indique l’adresse e-mail de ton/ta partenaire, pas la tienne.', "Enter your partner's email address, not yours.") }
  }

  const [{ data: couple }, { count: membres }] = await Promise.all([
    admin.from('couples').select('invite_token, pairing_code').eq('id', profile.couple_id).single(),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('couple_id', profile.couple_id),
  ])
  if (!couple) return { error: t(locale, 'Couple introuvable', 'Couple not found') }
  if ((membres ?? 0) >= 2) return { error: t(locale, 'Vous êtes déjà pairé·es.', "You're already paired up.") }

  const jour = new Date().toISOString().slice(0, 10)
  const { count: envoisDuJour } = await admin.from('rappels_envoyes')
    .select('couple_id', { count: 'exact', head: true })
    .eq('couple_id', profile.couple_id).eq('type', 'invitation').like('cle', `${jour}:%`)
  if ((envoisDuJour ?? 0) >= INVITATIONS_PAR_JOUR) {
    return { error: t(locale, 'Tu as déjà envoyé 3 invitations aujourd’hui. Réessaie demain, ou partage le lien autrement.', "You've already sent 3 invitations today. Try again tomorrow, or share the link another way.") }
  }
  const { error: reserveError } = await admin.from('rappels_envoyes')
    .insert({ couple_id: profile.couple_id, type: 'invitation', cle: `${jour}:${Date.now()}` })
  if (reserveError) return { error: reserveError.message }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const lien = `${baseUrl}/rejoindre?token=${couple.invite_token}`
  const prenomBrut = (profile.prenom || '').trim()
  const langue = isLocale(langueInvitation) ? langueInvitation : locale
  const ok = await envoyerModele({
    to: destinataire,
    cle: 'invitation_partenaire',
    locale: langue,
    vars: { invite_par: prenomBrut || t(langue, 'Ton/ta partenaire', 'Your partner'), lien, code: couple.pairing_code ?? '' },
  })
  if (!ok) return { error: t(locale, "L'e-mail n'a pas pu être envoyé. Réessaie dans quelques minutes.", 'The email could not be sent. Please try again in a few minutes.') }
  return { success: true }
}
