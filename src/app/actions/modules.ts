'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function sauvegarderReponse(
  moduleId: string,
  questionSlug: string,
  valeur: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('reponses')
    .upsert(
      {
        module_id: moduleId,
        user_id: user.id,
        question_slug: questionSlug,
        valeur,
      },
      { onConflict: 'module_id,user_id,question_slug' }
    )

  if (error) return { error: error.message }
  return { success: true }
}

export async function terminerModule(moduleId: string, moduleSlug: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'Aucun couple trouvé' }

  const { error: updateError } = await supabase
    .from('modules')
    .update({ statut: 'complete', completed_at: new Date().toISOString() })
    .eq('id', moduleId)

  if (updateError) return { error: updateError.message }

  // Déverrouiller le module suivant
  const ordreModules = ['valeurs', 'communication', 'intimite', 'finances', 'projets', 'famille', 'croissance']
  const indexActuel = ordreModules.indexOf(moduleSlug)
  const slugSuivant = ordreModules[indexActuel + 1]

  if (slugSuivant) {
    await supabase
      .from('modules')
      .update({ statut: 'en_cours' })
      .eq('couple_id', profile.couple_id)
      .eq('slug', slugSuivant)
  }

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}`)
  return { success: true }
}
