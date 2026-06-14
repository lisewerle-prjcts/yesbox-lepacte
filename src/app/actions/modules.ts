'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function sauvegarderReponse(moduleId: string, questionSlug: string, valeur: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('reponses').upsert(
    { module_id: moduleId, user_id: user.id, question_slug: questionSlug, valeur },
    { onConflict: 'module_id,user_id,question_slug' }
  )
  if (error) return { error: error.message }
  return { success: true }
}

export async function terminerModule(moduleId: string, moduleSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'Aucun couple trouvé' }

  await supabase.from('modules').update({ statut: 'complete', completed_at: new Date().toISOString() }).eq('id', moduleId)

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}`)
  return { success: true }
}

export async function scellerModule(moduleId: string, moduleSlug: string, connivenceScore: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'Aucun couple trouvé' }

  await supabase.from('modules').update({
    revealed: true,
    connivence_score: connivenceScore,
    revealed_at: new Date().toISOString(),
  }).eq('id', moduleId)

  // Déverrouiller le module suivant
  const ordre = ['moi', 'toi', 'nous', 'communication', 'conflits', 'engagement', 'renouvellement']
  const idx = ordre.indexOf(moduleSlug)
  if (idx >= 0 && idx < ordre.length - 1) {
    await supabase.from('modules').update({ statut: 'en_cours' })
      .eq('couple_id', profile.couple_id)
      .eq('slug', ordre[idx + 1])
  }

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}/revelation`)
  return { success: true }
}
