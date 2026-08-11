'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendBrandedEmail, mailConfigured } from '@/lib/mail'
import { z } from 'zod'

const inscriptionSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  passwordConfirmation: z.string(),
}).refine(data => data.password === data.passwordConfirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['passwordConfirmation'],
})

const connexionSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

export async function inscription(formData: FormData) {
  const parsed = inscriptionSchema.safeParse({
    nom: formData.get('nom'),
    prenom: formData.get('prenom'),
    email: formData.get('email'),
    password: formData.get('password'),
    passwordConfirmation: formData.get('passwordConfirmation'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { nom, prenom, email, password } = parsed.data

  // Le compte est créé avec l'email déjà confirmé : le site doit rester
  // utilisable immédiatement à l'inscription, sans dépendre de la
  // délivrabilité (souvent peu fiable) des emails de confirmation.
  const admin = createAdminClient()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nom, prenom },
  })

  if (createError) {
    if (createError.message.toLowerCase().includes('already')) {
      return { error: 'Cet email est déjà utilisé. Connecte-toi !' }
    }
    return { error: createError.message }
  }

  if (created.user) {
    await admin.from('profiles').update({ nom, prenom }).eq('id', created.user.id)
  }

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message }

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

// ============================================================
// Mot de passe oublié — on génère le lien nous-mêmes via l'API admin
// Supabase et on l'envoie par notre propre SMTP (Gmail), plutôt que de
// dépendre de l'envoi d'email intégré de Supabase (souvent peu fiable sans
// SMTP personnalisé configuré côté dashboard).
// ============================================================
export async function demanderResetMotDePasse(formData: FormData) {
  const email = (formData.get('email') as string || '').trim()
  if (!email) return { error: 'Email requis' }

  const admin = createAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'}/auth/callback?next=/reset-password`

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  // On ne révèle jamais si l'email existe ou non côté UI, mais on n'envoie
  // évidemment le mail que si le compte existe réellement.
  if (!error && data?.properties?.action_link) {
    if (!mailConfigured()) return { error: 'L\'envoi d\'email n\'est pas configuré — contacte l\'admin.' }
    try {
      await sendBrandedEmail(
        email,
        'Réinitialise ton mot de passe',
        `<p>Tu as demandé à réinitialiser ton mot de passe YES BOX.</p>
         <p style="margin:24px 0;"><a href="${data.properties.action_link}" style="background:#c5256e;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">Choisir un nouveau mot de passe</a></p>
         <p style="font-size:13px;color:#736c63;">Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>`
      )
    } catch {
      return { error: 'L\'envoi d\'email n\'est pas configuré — contacte l\'admin.' }
    }
  }

  return { success: true }
}

export async function definirNouveauMotDePasse(formData: FormData) {
  const password = formData.get('password') as string
  const passwordConfirmation = formData.get('passwordConfirmation') as string

  if (!password || password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères' }
  if (password !== passwordConfirmation) return { error: 'Les mots de passe ne correspondent pas' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Lien expiré — refais une demande de réinitialisation.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/tableau-de-bord')
}
