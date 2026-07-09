'use server'

import { createClient } from '@/lib/supabase/server'

// Ces actions agissent toujours sur la vraie session du navigateur — même
// pendant qu'un admin "voit l'espace de" quelqu'un d'autre, changer le mot
// de passe ou déconnecter les autres appareils doit rester sous le compte
// réellement connecté, jamais celui usurpé.

export async function changerMotDePasse(nouveauMotDePasse: string) {
  if (nouveauMotDePasse.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.auth.updateUser({ password: nouveauMotDePasse })
  if (error) return { error: error.message }
  return { success: true }
}

export async function deconnecterAutresAppareils() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) return { error: error.message }
  return { success: true }
}
