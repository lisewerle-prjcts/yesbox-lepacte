'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModuleBySlug } from '@/lib/modules-effective'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { consentementManquant } from '@/lib/consentement'
import { moduleDuCouple, etatReponses } from '@/lib/progression'
import { peutAccederModule } from '@/lib/abonnement'
import { ABONNEMENT_COLONNES } from '@/types'

export async function sauvegarderReponse(moduleId: string, questionSlug: string, valeur: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (await consentementManquant(supabase, user.id)) return { error: t(locale, 'Ton consentement est nécessaire pour enregistrer tes réponses.', 'Your consent is required to save your answers.') }

  // Uniquement dans un module de son propre couple, ouvert, accessible
  // (abonnement) et dont les réponses ne sont pas encore partagées.
  const admin = createAdminClient()
  const mod = await moduleDuCouple(admin, user.id, moduleId)
  if (!mod) return { error: t(locale, 'Module introuvable', 'Module not found') }
  if (mod.statut === 'locked') return { error: t(locale, 'Ce module n’est pas encore ouvert.', 'This module is not open yet.') }
  if (mod.revealed || mod.reponses_partagees) {
    return { error: t(locale, 'Vous avez tous les deux répondu : les réponses ne sont plus modifiables.', 'You have both answered: answers can no longer be changed.') }
  }
  const moduleInfo = await getEffectiveModuleBySlug(mod.slug)
  if (!moduleInfo?.questions.some(q => q.slug === questionSlug)) return { error: t(locale, 'Question introuvable', 'Question not found') }
  if (!moduleInfo.free) {
    const { data: couple } = await admin.from('couples').select(ABONNEMENT_COLONNES).eq('id', mod.couple_id).single()
    if (!peutAccederModule(moduleInfo, mod, couple)) return { error: t(locale, 'Un abonnement est nécessaire pour ce module.', 'A subscription is required for this module.') }
  }

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

  const admin = createAdminClient()
  const mod = await moduleDuCouple(admin, user.id, moduleId)
  if (!mod) return { error: t(locale, 'Module introuvable', 'Module not found') }
  const moduleInfo = await getEffectiveModuleBySlug(mod.slug)
  if (!moduleInfo) return { error: t(locale, 'Module introuvable', 'Module not found') }

  // Vérifie côté serveur que la personne a vraiment tout répondu ; partage
  // les réponses si l'autre a déjà fini (cf. etatReponses).
  const etat = await etatReponses(admin, mod, user.id, moduleInfo.questions)
  if (!etat.jaiTermine) return { error: t(locale, 'Il reste des questions sans réponse.', 'Some questions are still unanswered.') }

  if (mod.statut === 'en_cours') {
    await admin.from('modules').update({ statut: 'complete', completed_at: new Date().toISOString() }).eq('id', mod.id)
  }

  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}`)
  return { success: true, reponsesPartagees: etat.reponsesPartagees }
}
