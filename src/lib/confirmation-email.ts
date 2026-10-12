import { createAdminClient } from '@/lib/supabase/server'
import { envoyerMailDetail, mailConfigure } from '@/lib/mailer'
import { t, type Locale } from '@/lib/i18n/locale'
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
  const prenomSur = prenom.replace(/[<>&"']/g, '')
  return envoyerMailDetail({
    to: email,
    subject: t(locale, 'Confirme ton adresse e-mail — YES BOX', 'Confirm your email address — YES BOX'),
    body: `
      <p>${t(locale, 'Bonjour', 'Hello')} ${prenomSur},</p>
      <p>${t(locale, 'Pour activer ton compte YES BOX — Le Pacte, confirme ton adresse e-mail en cliquant sur le bouton ci-dessous :', 'To activate your YES BOX — Le Pacte account, confirm your email address by clicking the button below:')}</p>
      <p style="margin:24px 0;"><a href="${lien}" style="background:#c5256e;color:white;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;">${t(locale, 'Confirmer mon adresse', 'Confirm my address')}</a></p>
      <p style="font-size:12px;color:#736c63;">${t(locale, 'Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :', "If the button doesn't work, copy this link into your browser:")}<br>${lien}</p>
      <p style="font-size:12px;color:#736c63;">${t(locale, "Si tu n'es pas à l'origine de cette inscription, ignore simplement ce message.", "If you didn't sign up, simply ignore this message.")}</p>
    `,
  })
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
