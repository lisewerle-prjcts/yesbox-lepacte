'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { langueDuProfil } from '@/lib/i18n/langue-profil'
import { mailConfigure } from '@/lib/mailer'
import { envoyerModele, rendreModele } from '@/lib/modeles-email/serveur'

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

  const vars = { prenom: profile.prenom || '' }
  const objets = await Promise.all((['fr', 'en'] as const).map(async l => (await rendreModele('mot_de_passe_oublie', l, vars)).objet))
  // Pas plus d'une demande par minute pour une même adresse (journal des
  // e-mails ; ignoré si la table n'existe pas encore).
  const { data: recent } = await admin.from('emails_envoyes').select('id')
    .eq('destinataire', adresse).in('sujet', objets)
    .gte('envoye_le', new Date(Date.now() - 60_000).toISOString()).limit(1)
  if (recent?.length) return { success: true }

  const { data: lien, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: adresse })
  if (error || !lien?.properties?.hashed_token) {
    console.error(`[mot-de-passe] Lien impossible pour ${adresse} — ${error?.message ?? 'jeton manquant'}`)
    return { success: true }
  }

  const langue = await langueDuProfil(admin, profile.id)
  const url = `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(lien.properties.hashed_token)}&type=recovery`
  await envoyerModele({ to: adresse, cle: 'mot_de_passe_oublie', locale: langue, vars: { ...vars, lien: url } })
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
