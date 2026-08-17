'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { rejoindreCoupleParCode, creerCoupleSolo } from '@/app/actions/couple'
import { checkLoginLock, registerFailedLogin, clearLoginAttempts } from '@/lib/rate-limit'
import { hashRecoveryCode } from '@/lib/recovery-codes'
import { getRecoveryEmail } from '@/app/actions/security'
import { notifySecurityEvent } from '@/lib/admin-mail'
import { sendWelcomeEmail } from '@/lib/welcome-email'
import { z } from 'zod'

const inscriptionSchema = z.object({
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Les deux mots de passe ne correspondent pas',
  path: ['passwordConfirm'],
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
    passwordConfirm: formData.get('password_confirm'),
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

  const partnerCode = (formData.get('partner_code') as string | null)?.trim()

  if (data.user) {
    await supabase
      .from('profiles')
      .update({ prenom })
      .eq('id', data.user.id)

    if (partnerCode) {
      const result = await rejoindreCoupleParCode(data.user.id, partnerCode)
      revalidatePath('/', 'layout')
      if (result.success) redirect('/tableau-de-bord')
      redirect(`/tableau-de-bord?code_error=${encodeURIComponent(result.error || 'Code invalide')}`)
    }

    const coupleResult = await creerCoupleSolo(data.user.id)
    if (coupleResult.success && coupleResult.couple) {
      await sendWelcomeEmail(email, prenom, coupleResult.couple.pairing_code)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/tableau-de-bord')
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

  const lock = await checkLoginLock(email)
  if (lock.locked) {
    return { error: `Trop de tentatives. Réessaie dans ${lock.minutesLeft} minute${lock.minutesLeft > 1 ? 's' : ''}.` }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      await registerFailedLogin(email)
      return { error: 'Email ou mot de passe incorrect' }
    }
    return { error: error.message }
  }

  await clearLoginAttempts(email)

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
    return { mfaRequired: true }
  }

  revalidatePath('/', 'layout')
  redirect('/tableau-de-bord')
}

export async function verifierCodeMfa(code: string) {
  const supabase = await createClient()

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
  if (factorsError) return { error: factorsError.message }

  const factor = factors?.totp?.find(f => f.status === 'verified')
  if (!factor) return { error: 'Aucun facteur de double authentification actif trouvé' }

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/tableau-de-bord')
}

export async function verifierCodeRecuperationMfa(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée, reconnecte-toi.' }

  const admin = createAdminClient()
  const codeHash = hashRecoveryCode(code)
  const { data: match } = await admin
    .from('mfa_recovery_codes')
    .select('id')
    .eq('user_id', user.id)
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .maybeSingle()

  if (!match) return { error: 'Code de secours invalide ou déjà utilisé' }

  await admin.from('mfa_recovery_codes').update({ used_at: new Date().toISOString() }).eq('id', match.id)

  const { data: factorsData } = await admin.auth.admin.mfa.listFactors({ userId: user.id })
  for (const factor of factorsData?.factors ?? []) {
    await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user.id })
  }

  await notifySecurityEvent(
    await getRecoveryEmail(supabase, user.id),
    'Double authentification désactivée par code de secours — YES BOX Admin',
    'Un code de secours vient d\'être utilisé pour désactiver la double authentification de ton compte admin YES BOX suite à une perte d\'accès. Reconnecte-toi puis réactive la 2FA dès que possible depuis l\'onglet Sécurité. Si ce n\'est pas toi, change immédiatement ton mot de passe.'
  )

  await supabase.auth.signOut()
  redirect('/connexion?mfa_reset=1')
}

export async function deconnexion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
