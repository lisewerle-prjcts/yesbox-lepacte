'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'

export async function sauvegarderReponse(moduleId: string, questionSlug: string, valeur: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { error } = await supabase.from('reponses').upsert(
    { module_id: moduleId, user_id: user.id, question_slug: questionSlug, valeur },
    { onConflict: 'module_id,user_id,question_slug' }
  )
  if (error) return { error: error.message }
  return { success: true }
}

export async function terminerModule(moduleId: string, moduleSlug: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

  await supabase.from('modules').update({ statut: 'complete', completed_at: new Date().toISOString() }).eq('id', moduleId)

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}`)
  return { success: true }
}

// Scelle le module (marque la révélation comme faite) et déverrouille le
// suivant. Appelé une fois que les deux partenaires ont écrit leur
// conclusion — voir sauvegarderConclusion() dans actions/journal.ts.
export async function scellerModule(coupleId: string, moduleId: string, moduleSlug: string) {
  const supabase = await createClient()

  await supabase.from('modules').update({
    revealed: true,
    revealed_at: new Date().toISOString(),
  }).eq('id', moduleId)

  const modules = await getEffectiveModules()
  const ordre = modules.map(m => m.slug)
  const idx = ordre.indexOf(moduleSlug)
  if (idx >= 0 && idx < ordre.length - 1) {
    await supabase.from('modules').update({ statut: 'en_cours' })
      .eq('couple_id', coupleId)
      .eq('slug', ordre[idx + 1])
  }

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}/revelation`)
  return { success: true }
}
