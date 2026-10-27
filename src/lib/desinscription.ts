import { createHmac, timingSafeEqual } from 'crypto'
import { t, type Locale } from '@/lib/i18n/locale'

// Lien « Ne plus recevoir ces rappels » : signé, pour fonctionner sans être
// connecté·e (page /desinscription).

function secretRappels() {
  return process.env.RAPPELS_SECRET || process.env.CRON_SECRET || ''
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'
}

export function signatureDesinscription(userId: string) {
  return createHmac('sha256', secretRappels()).update(`rappels:${userId}`).digest('hex').slice(0, 32)
}

export function verifierSignatureDesinscription(userId: string, signature: string) {
  if (!secretRappels() || !userId || !signature) return false
  const attendue = Buffer.from(signatureDesinscription(userId))
  const recue = Buffer.from(signature)
  return attendue.length === recue.length && timingSafeEqual(attendue, recue)
}

export function lienDesinscription(userId: string, locale: Locale) {
  return `${appUrl()}/desinscription?u=${encodeURIComponent(userId)}&s=${signatureDesinscription(userId)}&l=${locale}`
}

// Désinscription en un clic depuis la messagerie (bouton « Se désabonner »
// de Gmail, Yahoo…) : en-têtes List-Unsubscribe (RFC 8058), que ces
// messageries demandent désormais. La messagerie envoie un POST à
// /api/desinscription.
export function entetesDesinscription(userId: string): Record<string, string> {
  const url = `${appUrl()}/api/desinscription?u=${encodeURIComponent(userId)}&s=${signatureDesinscription(userId)}`
  return { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
}

export function piedDePageRappel(userId: string, locale: Locale) {
  return `<p style="margin:24px 0 0;font-size:12px;color:#8a8580;">${t(locale, 'Tu reçois ce rappel parce que votre couple suit le parcours YES BOX.', 'You are receiving this reminder because your couple is following the YES BOX program.')} <a href="${lienDesinscription(userId, locale)}" style="color:#8a8580;">${t(locale, 'Ne plus recevoir ces rappels', 'Stop receiving these reminders')}</a></p>`
}
