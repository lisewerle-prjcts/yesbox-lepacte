import nodemailer from 'nodemailer'

export function mailConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

export async function sendBrandedEmail(to: string, subject: string, bodyHtml: string) {
  if (!mailConfigured()) throw new Error('GMAIL non configuré')

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
  })
  await transporter.sendMail({
    from: `"YES BOX" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fbf8f3;border-radius:16px;overflow:hidden;">
      <div style="background:#c5256e;padding:24px 32px;"><p style="color:white;font-family:monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px;">YES BOX — Le Pacte</p></div>
      <div style="padding:32px;color:#1a1816;font-size:15px;line-height:1.7;">${bodyHtml}</div>
      <div style="background:#1a1816;padding:16px 32px;text-align:center;"><p style="font-family:monospace;font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.08em;text-transform:uppercase;margin:0;">YES BOX · yesbox-lepacte.fr</p></div>
    </div>`,
  })
}
