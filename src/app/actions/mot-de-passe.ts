'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { langueDuProfil } from '@/lib/i18n/langue-profil'
import { envoyerMail, mailConfigure } from '@/lib/mailer'

// Mot de passe oublié. Le lien part de notre propre envoi (comme le mail de
// confirmation, cf. lib/confirmation-email) : Supabase ne fait que générer
// le jeton, vérifié par /auth/confirm, qui ouvre une session et mène à
// /nouveau-mot-de-passe. Contrairement à l'ancien lien Supabase (code
// valable seulement dans le navigateur de la demande, et page
// /reset-password inexistante), il fonctionne depuis n'importe quel
// navigateur ou téléphone.

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
}

const SUJET_FR = 'Choisis un nouveau mot de passe — YES BOX'
const SUJET_EN = 'Choose a new password — YES BOX'

// Répond toujours « envoyé » (sauf adresse vide) : on ne révèle pas si un
// compte existe pour cette adresse.
export async function demanderReinitialisation(email: string) {
  const locale = await getLocale()
  const adresse = email.trim().toLowerCase()
  if (!adresse) return { error: t(locale, 'Adresse e-mail requise', 'Email address required') }
  if (!mailConfigure()) return { error: t(locale, "L'envoi d'e-mails n'est pas disponible pour le moment.", 'Email sending is not available right now.') }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, prenom').eq('email', adresse).maybeSingle()
  if (!profile) return { success: true }

  // Pas plus d'une demande par minute pour une même adresse (journal des
  // e-mails ; ignoré si la table n'existe pas encore).
  const { data: recent } = await admin.from('emails_envoyes').select('id')
    .eq('destinataire', adresse).in('sujet', [SUJET_FR, SUJET_EN])
    .gte('envoye_le', new Date(Date.now() - 60_000).toISOString()).limit(1)
  if (recent?.length) return { success: true }

  const { data: lien, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: adresse })
  if (error || !lien?.properties?.hashed_token) {
    console.error(`[mot-de-passe] Lien impossible pour ${adresse} — ${error?.message ?? 'jeton manquant'}`)
    return { success: true }
  }

  const langue = await langueDuProfil(admin, profile.id)
  const url = `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(lien.properties.hashed_token)}&type=recovery`
  const prenom = (profile.prenom || '').replace(/[<>&"']/g, '')
  await envoyerMail({
    to: adresse,
    subject: t(langue, SUJET_FR, SUJET_EN),
    body: `
      <p>${t(langue, 'Bonjour', 'Hello')} ${prenom},</p>
      <p>${t(langue, 'Tu as demandé à changer ton mot de passe YES BOX. Clique sur le bouton ci-dessous pour en choisir un nouveau :', 'You asked to change your YES BOX password. Click the button below to choose a new one:')}</p>
      <p style="margin:24px 0;"><a href="${url}" style="background:#c5256e;color:white;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;">${t(langue, 'Choisir un nouveau mot de passe', 'Choose a new password')}</a></p>
      <p style="font-size:12px;color:#736c63;">${t(langue, 'Ce lien est valable 1 heure et ne sert qu\'une fois. Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :', 'This link is valid for 1 hour and can only be used once. If the button doesn\'t work, copy this link into your browser:')}<br>${url}</p>
      <p style="font-size:12px;color:#736c63;">${t(langue, "Si tu n'es pas à l'origine de cette demande, ignore ce message : ton mot de passe reste inchangé.", "If you didn't request this, ignore this message: your password stays the same.")}</p>
    `,
  })
  return { success: true }
}

export async function definirNouveauMotDePasse(motDePasse: string, confirmation: string) {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Le lien a expiré. Refais une demande de réinitialisation.', 'The link has expired. Please request a new reset link.') }
  if (motDePasse.length < 8) return { error: t(locale, 'Le mot de passe doit contenir au moins 8 caractères', 'The password must be at least 8 characters') }
  if (motDePasse !== confirmation) return { error: t(locale, 'Les deux mots de passe ne sont pas identiques', 'The two passwords do not match') }

  const { error } = await supabase.auth.updateUser({ password: motDePasse })
  if (error) {
    if (/aal2|mfa|factor/i.test(error.message)) {
      return { error: t(locale, 'Ce compte a la double authentification : connecte-toi avec ton code, puis change ton mot de passe depuis ton compte.', 'This account uses two-factor authentication: sign in with your code, then change your password from your account.') }
    }
    if (/same|different/i.test(error.message)) {
      return { error: t(locale, 'Choisis un mot de passe différent de l\'ancien.', 'Choose a password different from the old one.') }
    }
    return { error: error.message }
  }
  return { success: true }
}
