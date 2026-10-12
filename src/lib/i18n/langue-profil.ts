import type { createAdminClient } from '@/lib/supabase/server'
import { DEFAULT_LOCALE, isLocale, type Locale } from './locale'

type AdminClient = ReturnType<typeof createAdminClient>

// Langue de chaque personne pour les e-mails (profiles.langue), mémorisée
// quand elle choisit sa langue sur le site, s'inscrit ou se connecte.
// Lectures et écritures tolérantes : si la colonne manque encore en base,
// les e-mails partent en français comme avant.

export async function languesDesProfils(admin: AdminClient, ids: string[]): Promise<Map<string, Locale>> {
  const langues = new Map<string, Locale>()
  if (!ids.length) return langues
  const { data, error } = await admin.from('profiles').select('id, langue').in('id', ids)
  if (error) return langues
  for (const p of data ?? []) if (isLocale(p.langue)) langues.set(p.id, p.langue)
  return langues
}

export async function langueDuProfil(admin: AdminClient, id: string): Promise<Locale> {
  return (await languesDesProfils(admin, [id])).get(id) ?? DEFAULT_LOCALE
}

export async function enregistrerLangueProfil(admin: AdminClient, id: string, langue: Locale): Promise<void> {
  try {
    await admin.from('profiles').update({ langue }).eq('id', id)
  } catch (e) {
    console.error(`[langue] ${e instanceof Error ? e.message : String(e)}`)
  }
}
