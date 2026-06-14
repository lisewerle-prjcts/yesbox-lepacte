'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function sauvegarderJournal(coupleId: string, moduleSlug: string, contenu: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('journal_entries')
    .upsert({ couple_id: coupleId, module_slug: moduleSlug, contenu }, { onConflict: 'couple_id,module_slug' })
  if (error) return { error: error.message }
  revalidatePath('/journal')
  return { success: true }
}
