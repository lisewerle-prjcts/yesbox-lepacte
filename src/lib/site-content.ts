import { createAdminClient } from '@/lib/supabase/server'

export const SITE_CONTENT_PREFIX = 'site_content::'

/**
 * Lit tous les textes du site personnalisés depuis l'admin (mode édition),
 * en bypassant la RLS via le client service-role — comme getAllOverrides()
 * pour le contenu des modules. Le résultat est intégré au HTML rendu côté
 * serveur, jamais exposé comme lecture publique de la table `settings`.
 */
export async function getSiteContentMap(): Promise<Record<string, string>> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .like('key', `${SITE_CONTENT_PREFIX}%`)

  const map: Record<string, string> = {}
  for (const row of data || []) {
    map[row.key.slice(SITE_CONTENT_PREFIX.length)] = row.value
  }
  return map
}
