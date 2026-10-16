'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { rejoindreCoupleParCode } from '@/lib/couple-join'
import { ouvrirPremierModuleSiBesoin, MODULE_PACTE, MODULE_RDV_ANNUEL } from '@/lib/progression'
import { bornesRdvAnnuel, estDateValide } from '@/lib/rdv-annuel'
import { envoyerMail, mailConfigure } from '@/lib/mailer'

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
  if (!pacte?.revealed) return { error: t(locale, 'Le pacte se signe une fois le module 9 terminé.', 'The pact can be signed once module 9 is complete.') }
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

function echapperHtml(texte: string) {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Envoie au ou à la partenaire un e-mail d'invitation avec le lien pour
// rejoindre le couple et le code de pairage. Écrit dans la langue du site
// de la personne qui invite. Limité à 3 envois par jour et par couple.
export async function envoyerInvitationPartenaire(email: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

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
  const prenom = echapperHtml(prenomBrut)
  const p = (texte: string) => `<p style="margin:0 0 12px;">${texte}</p>`
  const bouton = `<p style="margin:24px 0;"><a href="${lien}" style="display:inline-block;background:#c5256e;color:white;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;">${t(locale, 'Rejoindre notre espace', 'Join our space')}</a></p>`

  const ok = await envoyerMail({
    to: destinataire,
    subject: prenomBrut
      ? t(locale, `${prenomBrut} t'invite à écrire votre pacte de couple`, `${prenomBrut} invites you to write your couple's pact`).replace(/[\r\n]+/g, ' ')
      : t(locale, 'Une invitation à écrire votre pacte de couple', "An invitation to write your couple's pact"),
    body: p(t(locale, 'Bonjour,', 'Hello,'))
      + p(prenom
        ? t(locale, `${prenom} a commencé YES BOX et t'invite à le faire à deux.`, `${prenom} has started YES BOX and is inviting you to do it together.`)
        : t(locale, 'Ton/ta partenaire a commencé YES BOX et t’invite à le faire à deux.', 'Your partner has started YES BOX and is inviting you to do it together.'))
      + p(t(locale,
        'YES BOX, ce sont des modules simples et ludiques pour parler de ce qui compte : chacun·e répond de son côté, puis vous découvrez vos réponses ensemble. Le module 1 est gratuit pour vous deux, sans carte bancaire.',
        "YES BOX is a set of simple, playful modules to talk about what matters: you each answer on your own, then discover your answers together. Module 1 is free for both of you, no card needed."))
      + bouton
      + p(t(locale, `Tu peux aussi créer ton compte sur le site et saisir le code de votre couple : <strong>${echapperHtml(couple.pairing_code ?? '')}</strong>`, `You can also create your account on the website and enter your couple code: <strong>${echapperHtml(couple.pairing_code ?? '')}</strong>`)),
  })
  if (!ok) return { error: t(locale, "L'e-mail n'a pas pu être envoyé. Réessaie dans quelques minutes.", 'The email could not be sent. Please try again in a few minutes.') }
  return { success: true }
}
