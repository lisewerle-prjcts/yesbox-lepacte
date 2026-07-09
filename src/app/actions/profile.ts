'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getEffectiveSession } from '@/lib/effective-session'

export async function marquerIntroVue(prenom: string) {
  const session = await getEffectiveSession()
  if (!session) redirect('/connexion')

  const prenomPropre = prenom.trim()
  if (prenomPropre.length < 2) return { error: 'Le prénom doit contenir au moins 2 caractères' }

  await session.db.from('profiles').update({ intro_vue: true, prenom: prenomPropre }).eq('id', session.userId)

  revalidatePath('/tableau-de-bord')
  redirect('/tableau-de-bord')
}
