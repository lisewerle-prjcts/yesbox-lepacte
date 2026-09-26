import { createAdminClient } from '@/lib/supabase/server'
import { getMailTransporter, mailHtml } from '@/lib/admin-mail'

export const WELCOME_EMAIL_DEFAULTS = {
  email_bienvenue_subject: 'Bienvenue sur YES BOX — voici ton code couple ✦',
  email_bienvenue_body: `Bonjour {prenom},

Ton compte YES BOX — Le Pacte est créé !

Voici ton code couple, à donner à ton/ta partenaire pour qu'il/elle rejoigne ton pacte :

{code}

Il/elle pourra le renseigner lors de son inscription, ou depuis son espace.

À très vite,
L'équipe YES BOX`,
}

// Renvoie true si l'e-mail est parti, false sinon (Gmail non configuré ou erreur d'envoi).
export async function sendWelcomeEmail(email: string, prenom: string, code: string): Promise<boolean> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return false

  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('settings')
    .select('key, value')
    .in('key', ['email_bienvenue_subject', 'email_bienvenue_body'])

  const map: Record<string, string> = {}
  settings?.forEach(s => { map[s.key] = s.value })

  const subjectTemplate = map.email_bienvenue_subject ?? WELCOME_EMAIL_DEFAULTS.email_bienvenue_subject
  const bodyTemplate = map.email_bienvenue_body ?? WELCOME_EMAIL_DEFAULTS.email_bienvenue_body

  // Le prénom est saisi librement à l'inscription : on neutralise tout HTML
  // (sinon un « prénom » pourrait injecter un lien piégé dans un e-mail
  // envoyé depuis notre adresse) et les retours à la ligne dans l'objet.
  const subject = subjectTemplate.replace(/\{prenom\}/g, prenom).replace(/\{code\}/g, code).replace(/[\r\n]+/g, ' ')
  const body = echapperHtml(bodyTemplate.replace(/\{prenom\}/g, prenom).replace(/\{code\}/g, code))

  const transporter = getMailTransporter()
  return transporter.sendMail({
    from: '"YES BOX" <lise.yesbox@gmail.com>',
    to: email,
    subject,
    html: mailHtml(body.split('\n').map(line => `<p style="margin:0 0 12px;">${line || '&nbsp;'}</p>`).join('')),
  }).then(() => true, () => false)
}

function echapperHtml(texte: string) {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Envoie l'e-mail de bienvenue (avec le code couple) une seule fois, et
// seulement une fois l'adresse confirmée : sinon n'importe qui pourrait
// faire envoyer un e-mail depuis notre adresse à une adresse qui n'est pas
// la sienne. Appelé à l'inscription (si l'adresse est déjà confirmée) et au
// retour du lien de confirmation (/auth/callback).
export async function envoyerBienvenueSiEnAttente(userId: string) {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('email, prenom, couple_id, email_bienvenue_envoye_le')
    .eq('id', userId)
    .single()
  if (!profile || profile.email_bienvenue_envoye_le || !profile.couple_id) return

  const { data: auth } = await admin.auth.admin.getUserById(userId)
  if (!auth?.user?.email_confirmed_at) return

  const { data: couple } = await admin.from('couples').select('pairing_code').eq('id', profile.couple_id).single()
  if (!couple?.pairing_code) return

  // Marqué avant l'envoi pour ne jamais l'envoyer deux fois.
  const { data: marque } = await admin
    .from('profiles')
    .update({ email_bienvenue_envoye_le: new Date().toISOString() })
    .eq('id', userId)
    .is('email_bienvenue_envoye_le', null)
    .select('id')
  if (!marque?.length) return

  await sendWelcomeEmail(profile.email, profile.prenom || '', couple.pairing_code)
}
