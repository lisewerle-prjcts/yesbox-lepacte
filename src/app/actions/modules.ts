'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveModules, getEffectiveModuleBySlug } from '@/lib/modules-effective'

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

  // Le statut du module n'est marqué "complete" pour le couple que lorsque
  // les DEUX membres ont fini — sinon le second membre à ouvrir le module
  // se retrouverait bloqué sur l'écran "déjà terminé" sans avoir pu répondre.
  const { data: partner } = await supabase.from('profiles').select('id').eq('couple_id', profile.couple_id).neq('id', user.id).single()

  let partnerDone = true
  if (partner) {
    const moduleInfo = await getEffectiveModuleBySlug(moduleSlug)
    const total = moduleInfo?.questions.length ?? 0
    if (total > 0) {
      const { count } = await supabase.from('reponses').select('id', { count: 'exact', head: true }).eq('module_id', moduleId).eq('user_id', partner.id)
      partnerDone = (count ?? 0) >= total
    }
  }

  if (partnerDone) {
    await supabase.from('modules').update({ statut: 'complete', completed_at: new Date().toISOString() }).eq('id', moduleId)
  }

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

  const modules = await getEffectiveModules()
  const ordre = modules.map(m => m.slug)

  // "moi" et "toi" forment une paire jouée en parallèle (reveal croisé) :
  // le module suivant ne se débloque qu'une fois les DEUX scellés, peu
  // importe lequel des deux l'est en premier.
  if (moduleSlug === 'moi' || moduleSlug === 'toi') {
    const pairSlug = moduleSlug === 'moi' ? 'toi' : 'moi'
    const { data: pairModule } = await supabase.from('modules').select('revealed').eq('couple_id', profile.couple_id).eq('slug', pairSlug).single()
    if (pairModule?.revealed) {
      const idxToi = ordre.indexOf('toi')
      if (idxToi >= 0 && idxToi < ordre.length - 1) {
        await supabase.from('modules').update({ statut: 'en_cours' })
          .eq('couple_id', profile.couple_id)
          .eq('slug', ordre[idxToi + 1])
      }
    }
  } else {
    const idx = ordre.indexOf(moduleSlug)
    if (idx >= 0 && idx < ordre.length - 1) {
      await supabase.from('modules').update({ statut: 'en_cours' })
        .eq('couple_id', profile.couple_id)
        .eq('slug', ordre[idx + 1])
    }
  }

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}/revelation`)
  return { success: true }
}
