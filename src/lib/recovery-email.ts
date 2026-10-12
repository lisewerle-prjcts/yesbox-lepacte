import type { createClient } from '@/lib/supabase/server'

export const RECOVERY_EMAIL_KEY_PREFIX = 'admin_recovery_email::'

// Adresse de secours d'un compte admin (alertes de sécurité). Hors du
// fichier d'actions serveur : une fonction exportée d'un fichier
// 'use server' devient appelable depuis le navigateur.
export async function getRecoveryEmail(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('settings').select('value').eq('key', `${RECOVERY_EMAIL_KEY_PREFIX}${userId}`).single()
  return data?.value ?? null
}
