'use server'

import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function soumettrePrecommande(formData: FormData) {
  const supabase = await createClient()

  const prenom = (formData.get('prenom') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const adresse = (formData.get('adresse') as string)?.trim() || null
  const message = (formData.get('message') as string)?.trim() || null

  if (!prenom || !email) return { error: 'Prénom et email requis' }
  if (!email.includes('@')) return { error: 'Email invalide' }

  const { error } = await supabase
    .from('precommandes')
    .insert({ prenom, email, adresse, message })

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return { error: 'Cet email est déjà inscrit sur la liste !' }
    }
    return { error: 'Une erreur est survenue, réessaie.' }
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const transporter = getTransporter()
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    // Notification admin
    await transporter.sendMail({
      from: `"YES BOX" <${process.env.GMAIL_USER}>`,
      to: 'lise.werle@gmail.com',
      subject: `✦ Nouvelle pré-commande — ${prenom}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fbf8f3;border-radius:16px;overflow:hidden;">
          <div style="background:#c5256e;padding:24px 32px;">
            <p style="color:white;font-family:monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px;">YES BOX — Le Pacte</p>
            <h1 style="color:white;font-size:22px;margin:0;">Nouvelle pré-commande ✦</h1>
          </div>
          <div style="padding:32px;color:#1a1816;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #e6dfd1;"><td style="padding:10px 0;color:#736c63;width:120px;">Prénom</td><td style="padding:10px 0;font-weight:600;">${prenom}</td></tr>
              <tr style="border-bottom:1px solid #e6dfd1;"><td style="padding:10px 0;color:#736c63;">Email</td><td style="padding:10px 0;"><a href="mailto:${email}" style="color:#c5256e;">${email}</a></td></tr>
              ${adresse ? `<tr style="border-bottom:1px solid #e6dfd1;"><td style="padding:10px 0;color:#736c63;">Adresse</td><td style="padding:10px 0;">${adresse}</td></tr>` : ''}
              ${message ? `<tr><td style="padding:10px 0;color:#736c63;vertical-align:top;">Message</td><td style="padding:10px 0;font-style:italic;">${message}</td></tr>` : ''}
            </table>
            <p style="margin:24px 0 0;font-size:12px;color:#736c63;">Reçu le ${date}</p>
          </div>
        </div>`,
    }).catch(() => {})

    // Confirmation au pré-commandeur
    await transporter.sendMail({
      from: `"YES BOX" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Ta pré-commande YES BOX est confirmée ✦',
      html: `
        <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fbf8f3;border-radius:16px;overflow:hidden;">
          <div style="background:#c5256e;padding:24px 32px;">
            <p style="color:white;font-family:monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px;">YES BOX — Le Pacte</p>
            <h1 style="color:white;font-size:22px;margin:0;">Ta place est réservée ✦</h1>
          </div>
          <div style="padding:32px;color:#1a1816;">
            <p style="font-size:16px;margin:0 0 16px;">Bonjour ${prenom},</p>
            <p style="font-size:15px;line-height:1.7;color:#3b3733;margin:0 0 16px;">Merci pour ta pré-commande ! Tu fais partie des premiers couples à rejoindre <strong>YES BOX — Le Pacte</strong>.</p>
            <p style="font-size:15px;line-height:1.7;color:#3b3733;margin:0 0 24px;">Le programme ouvre le <strong>1er septembre 2026</strong>. Tu recevras un email dès que tu pourras accéder à ton espace couple et commencer le Module 1 gratuitement.</p>
            <div style="background:#f7d9e6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
              <p style="font-size:13px;color:#c5256e;font-weight:600;margin:0 0 4px;font-family:monospace;letter-spacing:.08em;text-transform:uppercase;">Ce qui t'attend</p>
              <p style="font-size:14px;color:#3b3733;margin:0;line-height:1.7;">7 modules pour se choisir en conscience · Sessions de révélation à deux · Votre CDD de couple à re-signer chaque année</p>
            </div>
            <p style="font-size:13px;color:#736c63;margin:0;">Des questions ? Réponds à cet email ou écris-nous à <a href="mailto:lise.werle@gmail.com" style="color:#c5256e;">lise.werle@gmail.com</a>.</p>
          </div>
          <div style="background:#1a1816;padding:16px 32px;text-align:center;">
            <p style="font-family:monospace;font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.08em;text-transform:uppercase;margin:0;">YES BOX · yesbox-lepacte.fr</p>
          </div>
        </div>`,
    }).catch(() => {})
  }

  return { success: true }
}
