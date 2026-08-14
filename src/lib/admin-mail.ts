import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Accès refusé')
  return supabase
}

export function getMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

export function mailHtml(body: string) {
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fbf8f3;border-radius:16px;overflow:hidden;">
    <div style="background:#c5256e;padding:24px 32px;"><p style="color:white;font-family:monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px;">YES BOX — Le Pacte</p></div>
    <div style="padding:32px;color:#1a1816;font-size:15px;line-height:1.7;">${body}</div>
    <div style="background:#1a1816;padding:16px 32px;text-align:center;"><p style="font-family:monospace;font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.08em;text-transform:uppercase;margin:0;">YES BOX · yesbox-lepacte.fr</p></div>
  </div>`
}

export async function notifySecurityEvent(recipientEmail: string | null, subject: string, bodyText: string) {
  if (!recipientEmail || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return
  const transporter = getMailTransporter()
  await transporter.sendMail({
    from: '"YES BOX Sécurité" <lise.yesbox@gmail.com>',
    to: recipientEmail,
    subject,
    html: mailHtml(`<p>${bodyText}</p><p style="font-size:12px;color:#736c63;">${new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</p>`),
  }).catch(() => {})
}
