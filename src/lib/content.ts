import { createClient } from '@/lib/supabase/server'

/**
 * Charge tous les textes réécrits par l'admin (clé -> valeur). Table
 * publique en lecture, donc utilisable aussi bien pour un visiteur anonyme
 * (page publique) que pour un couple connecté.
 */
export async function getAllOverrides(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('content_overrides').select('key, value')
  const map: Record<string, string> = {}
  for (const row of data || []) map[row.key] = row.value
  return map
}
