import nodemailer from 'nodemailer'

// Envoi de tous les e-mails du site.
// - Si RESEND_API_KEY est configurée : envoi par Resend depuis notre domaine
//   (lise@yesbox-lepacte.fr), authentifié par SPF/DKIM → bien moins de spams.
// - Sinon : repli sur l'ancien envoi par Gmail (GMAIL_USER / GMAIL_APP_PASSWORD).
// Chaque e-mail part avec une version HTML et une version texte simple.

const EXPEDITEUR_DOMAINE = process.env.MAIL_FROM || 'lise@yesbox-lepacte.fr'
// Les réponses arrivent dans la boîte Gmail, tant que l'adresse du domaine
// ne reçoit pas de courrier.
const REPONDRE_A = process.env.MAIL_REPLY_TO || 'lise.yesbox@gmail.com'

export function mailConfigure() {
  return !!process.env.RESEND_API_KEY || (!!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD)
}

export function mailHtml(body: string) {
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fbf8f3;border-radius:16px;overflow:hidden;">
    <div style="background:#c5256e;padding:24px 32px;"><p style="color:white;font-family:monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px;">YES BOX — Le Pacte</p></div>
    <div style="padding:32px;color:#1a1816;font-size:15px;line-height:1.7;">${body}</div>
    <div style="background:#1a1816;padding:16px 32px;text-align:center;"><p style="font-family:monospace;font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.08em;text-transform:uppercase;margin:0;">YES BOX · yesbox-lepacte.fr</p></div>
  </div>`
}

// Version texte simple d'un corps HTML : paragraphes et retours à la ligne
// conservés, liens écrits en clair, balises retirées.
export function htmlVersTexte(html: string) {
  return html
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const texte = label.replace(/<[^>]+>/g, '').trim()
      return texte && texte !== href ? `${texte} : ${href}` : href
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface Mail {
  to: string
  subject: string
  /** Corps HTML (sans l'habillage YES BOX, ajouté ici). */
  body: string
  /** Nom affiché de l'expéditeur. */
  nom?: string
}

// Renvoie true si l'e-mail est parti, false sinon (aucun envoi configuré ou erreur).
export async function envoyerMail(mail: Mail): Promise<boolean> {
  return (await envoyerMailDetail(mail)).ok
}

// Comme envoyerMail, mais renvoie aussi la raison de l'échec (message de
// Resend ou de Gmail), affichée dans l'admin et écrite dans les logs.
// Si Resend refuse l'envoi (ex. domaine pas encore validé chez Resend, qui
// n'autorise alors que l'adresse du compte Resend), on réessaie par Gmail.
export async function envoyerMailDetail({ to, subject, body, nom = 'YES BOX' }: Mail): Promise<{ ok: boolean; erreur?: string }> {
  const html = mailHtml(body)
  const text = `${htmlVersTexte(body)}\n\n--\nYES BOX · yesbox-lepacte.fr`
  const erreurs: string[] = []

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${nom} <${EXPEDITEUR_DOMAINE}>`, to: [to], reply_to: REPONDRE_A, subject, html, text }),
      })
      if (res.ok) return { ok: true }
      const detail = await res.json().catch(() => null) as { message?: string } | null
      erreurs.push(`Resend (${res.status}) : ${detail?.message || res.statusText}`)
    } catch (e) {
      erreurs.push(`Resend : ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    try {
      await transporter.sendMail({
        from: { name: nom, address: process.env.GMAIL_USER },
        to,
        subject,
        html,
        text,
      })
      if (erreurs.length) console.warn(`[mail] Envoyé par Gmail après échec de Resend (${to}) — ${erreurs.join(' | ')}`)
      return { ok: true }
    } catch (e) {
      erreurs.push(`Gmail : ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const erreur = erreurs.join(' | ') || 'Aucun envoi d\'e-mail configuré'
  console.error(`[mail] Échec de l'envoi à ${to} — ${erreur}`)
  return { ok: false, erreur }
}
