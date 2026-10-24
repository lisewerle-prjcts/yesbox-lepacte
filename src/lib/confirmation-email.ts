import { createAdminClient } from '@/lib/supabase/server'
import { envoyerMailDetail, mailConfigure } from '@/lib/mailer'
import type { Locale } from '@/lib/i18n/locale'
import { rendreModele } from '@/lib/modeles-email/serveur'
import { langueDuProfil } from '@/lib/i18n/langue-profil'

// Le mail de confirmation d'adresse part de notre propre envoi (Resend, ou
// Gmail en repli — voir lib/mailer) plutôt que du service d'envoi de Supabase, qui échouait
// (« Error sending confirmation email »). Supabase ne fait que générer le
// lien ; /auth/confirm le vérifie, dans n'importe quel navigateur.

export const gmailConfigure = mailConfigure

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
}

export function lienConfirmation(hashedToken: string, type: 'signup' | 'magiclink') {
  return `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${type}`
}

export async function envoyerMailConfirmation(email: string, prenom: string, lien: string, locale: Locale = 'fr'): Promise<boolean> {
  return (await envoyerMailConfirmationDetail(email, prenom, lien, locale)).ok
}

async function envoyerMailConfirmationDetail(email: string, prenom: string, lien: string, locale: Locale): Promise<{ ok: boolean; erreur?: string }> {
  if (!gmailConfigure()) return { ok: false, erreur: 'Aucun envoi d\'e-mail configuré' }
  const { objet, html } = await rendreModele('confirmation_adresse', locale, { prenom, lien })
  return envoyerMailDetail({ to: email, subject: objet, body: html })
}

// Renvoi pour un compte existant non confirmé. Renvoie false si rien n'est
// parti (compte introuvable, déjà confirmé, ou échec d'envoi).
export async function renvoyerMailConfirmation(email: string): Promise<{ ok: boolean; raison?: string; erreur?: string }> {
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, prenom').eq('email', email.toLowerCase()).maybeSingle()
  if (!profile) return { ok: false, raison: 'introuvable' }
  const { data } = await admin.auth.admin.getUserById(profile.id)
  if (!data?.user) return { ok: false, raison: 'introuvable' }
  if (data.user.email_confirmed_at) return { ok: false, raison: 'deja_confirme' }

  const { data: lien, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !lien?.properties?.hashed_token) return { ok: false, raison: error?.message || 'lien' }

  const envoi = await envoyerMailConfirmationDetail(email, profile.prenom || '', lienConfirmation(lien.properties.hashed_token, 'magiclink'), await langueDuProfil(admin, profile.id))
  return envoi.ok ? { ok: true } : { ok: false, raison: 'envoi', erreur: envoi.erreur }
}
