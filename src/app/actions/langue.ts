'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isLocale } from '@/lib/i18n/locale'
import { enregistrerLangueProfil } from '@/lib/i18n/langue-profil'

// Changement de langue sur le site : mémorisé sur le profil (si la personne
// est connectée) pour que les e-mails suivants partent dans cette langue.
export async function memoriserLangue(langue: string) {
  if (!isLocale(langue)) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await enregistrerLangueProfil(createAdminClient(), user.id, langue)
}
