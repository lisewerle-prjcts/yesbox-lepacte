'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const identiteSchema = z.object({
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  nom: z.string().optional(),
})

export async function updateIdentite(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const parsed = identiteSchema.safeParse({
    prenom: formData.get('prenom'),
    nom: (formData.get('nom') as string | null)?.trim() || undefined,
  })

  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { prenom, nom } = parsed.data

  const { error } = await supabase
    .from('profiles')
    .update({ prenom, nom: nom || null })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateCouple(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'Aucun couple trouvé' }

  const nomCouple = (formData.get('nom_couple') as string | null)?.trim()
  const dateAnniversaire = (formData.get('date_anniversaire') as string | null)?.trim()

  const { error } = await supabase
    .from('couples')
    .update({ nom_couple: nomCouple || null, date_anniversaire: dateAnniversaire || null })
    .eq('id', profile.couple_id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
