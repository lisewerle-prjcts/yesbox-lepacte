'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function marquerIntroVue() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  await supabase.from('profiles').update({ intro_vue: true }).eq('id', user.id)

  revalidatePath('/tableau-de-bord')
  redirect('/tableau-de-bord')
}
