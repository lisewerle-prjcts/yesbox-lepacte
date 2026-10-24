import { createAdminClient } from '@/lib/supabase/server'
import { mailConfigure } from '@/lib/mailer'
import { envoyerModele } from '@/lib/modeles-email/serveur'
import type { Locale } from '@/lib/i18n/locale'
import { langueDuProfil } from '@/lib/i18n/langue-profil'

// Texte : modèle « bienvenue » (src/lib/modeles-email/catalogue.ts),
// modifiable depuis l'admin.
// Renvoie true si l'e-mail est parti, false sinon (envoi non configuré ou erreur).
export async function sendWelcomeEmail(email: string, prenom: string, code: string, locale: Locale = 'fr'): Promise<boolean> {
  if (!mailConfigure()) return false
  return envoyerModele({ to: email, cle: 'bienvenue', locale, vars: { prenom, code } })
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

  await sendWelcomeEmail(profile.email, profile.prenom || '', couple.pairing_code, await langueDuProfil(admin, userId))
}
