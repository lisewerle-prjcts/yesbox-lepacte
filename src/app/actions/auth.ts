'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const inscriptionSchema = z.object({
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

const connexionSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

export async function inscription(formData: FormData) {
  const supabase = await createClient()

  const parsed = inscriptionSchema.safeParse({
    prenom: formData.get('prenom'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { prenom, email, password } = parsed.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { prenom },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Cet email est déjà utilisé. Connecte-toi !' }
    }
    return { error: error.message }
  }

  if (data.user) {
    await supabase
      .from('profiles')
      .update({ prenom })
      .eq('id', data.user.id)
  }

  revalidatePath('/', 'layout')
  redirect('/inviter-partenaire')
}

export async function connexion(formData: FormData) {
  const supabase = await createClient()

  const parsed = connexionSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { email, password } = parsed.data

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email ou mot de passe incorrect' }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/tableau-de-bord')
}

export async function deconnexion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
