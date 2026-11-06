import { createAdminClient } from '@/lib/supabase/server'

export const RECOVERY_EMAIL_KEY_PREFIX = 'admin_recovery_email::'

// Adresse de secours d'un compte admin (alertes de sécurité). Hors du
// fichier d'actions serveur : une fonction exportée d'un fichier
// 'use server' devient appelable depuis le navigateur.
// Lue avec la clé service : la base exige le code de double authentification
// pour lire les réglages, or l'alerte « code de secours utilisé » part
// justement d'une session qui n'a pas saisi ce code. `userId` vient toujours
// de la session côté serveur.
export async function getRecoveryEmail(userId: string) {
  const { data } = await createAdminClient().from('settings').select('value').eq('key', `${RECOVERY_EMAIL_KEY_PREFIX}${userId}`).maybeSingle()
  return data?.value ?? null
}
