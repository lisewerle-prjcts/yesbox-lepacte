'use server'

import { revalidatePath } from 'next/cache'
import { getEffectiveSession } from '@/lib/effective-session'

export async function sauvegarderJournal(coupleId: string, moduleSlug: string, contenu: string) {
  const session = await getEffectiveSession()
  if (!session) return { error: 'Non authentifié' }
  if (session.profile.couple_id !== coupleId) return { error: 'Accès refusé' }

  const { error } = await session.db
    .from('journal_entries')
    .upsert({ couple_id: coupleId, module_slug: moduleSlug, contenu }, { onConflict: 'couple_id,module_slug' })
  if (error) return { error: error.message }
  revalidatePath('/journal')
  return { success: true }
}
