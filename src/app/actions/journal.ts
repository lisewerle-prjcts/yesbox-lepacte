'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { scellerModule } from '@/app/actions/modules'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { consentementManquant } from '@/lib/consentement'
import type { ConclusionSlug } from '@/types'

const CONCLUSION_SLUGS: ConclusionSlug[] = ['apprentissage', 'surprise']

// Chaque partenaire écrit sa conclusion de son côté, en 2 questions
// ("qu'as-tu appris ?" / "qu'est-ce qui t'a surpris ?"). Une fois que les
// deux ont écrit la leur pour ce module, il se scelle et le suivant se
// débloque.
export async function sauvegarderConclusion(
  coupleId: string,
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

  const rows = [
    { couple_id: coupleId, module_slug: moduleSlug, user_id: user.id, question_slug: 'apprentissage', valeur: apprentissage },
    { couple_id: coupleId, module_slug: moduleSlug, user_id: user.id, question_slug: 'surprise', valeur: surprise },
  ]
  const { error } = await supabase
    .from('journal_entries')
    .upsert(rows, { onConflict: 'couple_id,module_slug,user_id,question_slug' })
  if (error) return { error: error.message }

  const { data: partner } = await supabase
    .from('profiles').select('id').eq('couple_id', coupleId).neq('id', user.id).maybeSingle()

  let sealed = false
  if (partner) {
    const { data: partnerEntries } = await supabase
      .from('journal_entries')
      .select('question_slug, valeur')
      .eq('couple_id', coupleId)
      .eq('module_slug', moduleSlug)
      .eq('user_id', partner.id)

    const partnerDone = CONCLUSION_SLUGS.every(slug =>
      partnerEntries?.some(e => e.question_slug === slug && e.valeur?.trim())
    )
    if (partnerDone) {
      await scellerModule(coupleId, moduleId, moduleSlug)
      sealed = true
    }
  }

  revalidatePath('/journal')
  revalidatePath(`/module/${moduleSlug}/revelation`)
  return { success: true, sealed }
}
