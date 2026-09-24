'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { consentementManquant } from '@/lib/consentement'
import { moduleDuCouple, revelerSiPret } from '@/lib/progression'

// Chaque partenaire écrit sa conclusion de son côté, en 2 questions
// ("qu'as-tu appris ?" / "qu'est-ce qui t'a surpris ?"), une fois que les
// deux ont répondu à toutes les questions. Quand les deux conclusions sont
// écrites, le module est révélé et le suivant se débloque.
// `_coupleId` est ignoré : le couple est déduit du module, côté serveur.
export async function sauvegarderConclusion(
  _coupleId: string,
  moduleId: string,
  moduleSlug: string,
  apprentissage: string,
  surprise: string
) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (await consentementManquant(supabase, user.id)) return { error: t(locale, 'Ton consentement est nécessaire pour enregistrer tes réponses.', 'Your consent is required to save your answers.') }

  const admin = createAdminClient()
  const mod = await moduleDuCouple(admin, user.id, moduleId)
  if (!mod || mod.slug !== moduleSlug) return { error: t(locale, 'Module introuvable', 'Module not found') }
  if (mod.revealed) return { error: t(locale, 'Ce module est déjà révélé.', 'This module has already been revealed.') }
  if (!mod.reponses_partagees) {
    return { error: t(locale, 'Vous devez d’abord avoir tous les deux répondu à toutes les questions.', 'You both need to answer every question first.') }
  }

  const rows = [
    { couple_id: mod.couple_id, module_slug: mod.slug, user_id: user.id, question_slug: 'apprentissage', valeur: apprentissage },
    { couple_id: mod.couple_id, module_slug: mod.slug, user_id: user.id, question_slug: 'surprise', valeur: surprise },
  ]
  const { error } = await supabase
    .from('journal_entries')
    .upsert(rows, { onConflict: 'couple_id,module_slug,user_id,question_slug' })
  if (error) return { error: error.message }

  const ordre = (await getEffectiveModules()).map(m => m.slug)
  const sealed = await revelerSiPret(admin, mod, ordre)

  revalidatePath('/journal')
  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}/revelation`)
  return { success: true, sealed }
}
