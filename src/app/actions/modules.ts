'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getEffectiveSession } from '@/lib/effective-session'
import { MODULE_ORDER } from '@/lib/modules-data'

export async function sauvegarderReponse(moduleId: string, questionSlug: string, valeur: string) {
  const session = await getEffectiveSession()
  if (!session) return { error: 'Non authentifié' }

  const { error } = await session.db.from('reponses').upsert(
    { module_id: moduleId, user_id: session.userId, question_slug: questionSlug, valeur },
    { onConflict: 'module_id,user_id,question_slug' }
  )
  if (error) return { error: error.message }
  return { success: true }
}

export async function terminerModule(moduleId: string, moduleSlug: string) {
  const session = await getEffectiveSession()
  if (!session) return { error: 'Non authentifié' }
  if (!session.profile.couple_id) return { error: 'Aucun couple trouvé' }

  await session.db.from('modules').update({ statut: 'complete', completed_at: new Date().toISOString() }).eq('id', moduleId)

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}`)
  return { success: true }
}

export async function noterConnivence(moduleId: string, moduleSlug: string, score: number) {
  const session = await getEffectiveSession()
  if (!session) return { error: 'Non authentifié' }
  if (!session.profile.couple_id) return { error: 'Aucun couple trouvé' }
  const { db: supabase, userId, profile } = session

  const { error } = await supabase.from('scores').upsert(
    { module_id: moduleId, user_id: userId, score },
    { onConflict: 'module_id,user_id' }
  )
  if (error) return { error: error.message }

  // Une fois que les deux partenaires ont noté, le module est révélé et le suivant se débloque
  const { count } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('module_id', moduleId)

  let revealed = false
  if ((count ?? 0) >= 2) {
    revealed = true
    await supabase.from('modules').update({
      revealed: true,
      revealed_at: new Date().toISOString(),
    }).eq('id', moduleId)

    const idx = MODULE_ORDER.indexOf(moduleSlug as (typeof MODULE_ORDER)[number])
    if (idx >= 0 && idx < MODULE_ORDER.length - 1) {
      await supabase.from('modules').update({ statut: 'en_cours' })
        .eq('couple_id', profile.couple_id)
        .eq('slug', MODULE_ORDER[idx + 1])
        .eq('cycle', 1)
    }
  }

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}/revelation`)
  return { success: true, revealed }
}

export async function recommencerModule(moduleSlug: string) {
  const session = await getEffectiveSession()
  if (!session) return { error: 'Non authentifié' }
  if (!session.profile.couple_id) return { error: 'Aucun couple trouvé' }
  const { db: supabase, profile } = session

  const { data: dernierCycle } = await supabase
    .from('modules')
    .select('cycle, revealed')
    .eq('couple_id', profile.couple_id)
    .eq('slug', moduleSlug)
    .order('cycle', { ascending: false })
    .limit(1)
    .single()

  if (!dernierCycle?.revealed) return { error: 'Ce module n\'est pas encore scellé' }

  const prochainCycle = (dernierCycle?.cycle ?? 0) + 1

  const { error } = await supabase.from('modules').insert({
    couple_id: profile.couple_id,
    slug: moduleSlug,
    cycle: prochainCycle,
    statut: 'en_cours',
  })
  if (error) return { error: error.message }

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}`)
  redirect(`/module/${moduleSlug}`)
}
