'use server'

import { createClient } from '@/lib/supabase/server'

export async function soumettrePrecommande(formData: FormData) {
  const supabase = await createClient()

  const prenom = (formData.get('prenom') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const adresse = (formData.get('adresse') as string)?.trim() || null
  const message = (formData.get('message') as string)?.trim() || null

  if (!prenom || !email) return { error: 'Prénom et email requis' }
  if (!email.includes('@')) return { error: 'Email invalide' }

  const { error } = await supabase
    .from('precommandes')
    .insert({ prenom, email, adresse, message })

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return { error: 'Cet email est déjà inscrit sur la liste !' }
    }
    return { error: 'Une erreur est survenue, réessaie.' }
  }

  return { success: true }
}
