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

export async function sendWelcomeEmail(email: string, prenom: string, code: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('settings')
    .select('key, value')
    .in('key', ['email_bienvenue_subject', 'email_bienvenue_body'])

  const map: Record<string, string> = {}
  settings?.forEach(s => { map[s.key] = s.value })

  const subjectTemplate = map.email_bienvenue_subject ?? WELCOME_EMAIL_DEFAULTS.email_bienvenue_subject
  const bodyTemplate = map.email_bienvenue_body ?? WELCOME_EMAIL_DEFAULTS.email_bienvenue_body

  const subject = subjectTemplate.replace(/\{prenom\}/g, prenom).replace(/\{code\}/g, code)
  const body = bodyTemplate.replace(/\{prenom\}/g, prenom).replace(/\{code\}/g, code)

  const transporter = getMailTransporter()
  await transporter.sendMail({
    from: '"YES BOX" <lise.yesbox@gmail.com>',
    to: email,
    subject,
    html: mailHtml(body.split('\n').map(line => `<p style="margin:0 0 12px;">${line || '&nbsp;'}</p>`).join('')),
  }).catch(() => {})
}
