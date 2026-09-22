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
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { z } from 'zod'
import type { Locale } from '@/lib/i18n/locale'

function inscriptionSchema(locale: Locale) {
  return z.object({
    prenom: z.string().min(2, t(locale, 'Le prénom doit contenir au moins 2 caractères', 'First name must be at least 2 characters')),
    email: z.string().email(t(locale, 'Email invalide', 'Invalid email')),
    password: z.string().min(8, t(locale, 'Le mot de passe doit contenir au moins 8 caractères', 'Password must be at least 8 characters')),
    passwordConfirm: z.string(),
  }).refine((data) => data.password === data.passwordConfirm, {
    message: t(locale, 'Les deux mots de passe ne correspondent pas', "The two passwords don't match"),
    path: ['passwordConfirm'],
  })
}

function connexionSchema(locale: Locale) {
  return z.object({
    email: z.string().email(t(locale, 'Email invalide', 'Invalid email')),
    password: z.string().min(1, t(locale, 'Le mot de passe est requis', 'Password is required')),
  })
}

export async function inscription(formData: FormData) {
  const supabase = await createClient()
  const locale = await getLocale()

  const parsed = inscriptionSchema(locale).safeParse({
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
      return { error: t(locale, 'Cet email est déjà utilisé. Connecte-toi !', 'This email is already in use. Log in instead!') }
    }
    return { error: error.message }
  }

  const partnerCode = (formData.get('partner_code') as string | null)?.trim()
  let partnerCodeError: string | null = null

  if (data.user) {
    await supabase
      .from('profiles')
      .update({ prenom })
      .eq('id', data.user.id)

    if (partnerCode) {
      const result = await rejoindreCoupleParCode(data.user.id, partnerCode)
      if (!result.success) partnerCodeError = result.error || t(locale, 'Code invalide', 'Invalid code')
    } else {
      const codeParrainage = (formData.get('code_parrainage') as string | null)?.trim()
      const coupleResult = await creerCoupleSolo(data.user.id, codeParrainage)
      if (coupleResult.success && coupleResult.couple) {
        await sendWelcomeEmail(email, prenom, coupleResult.couple.pairing_code)
      }
    }
  }

  revalidatePath('/', 'layout')

  // Confirmation d'email requise : pas de session, on ne peut pas encore entrer dans l'espace.
  if (!data.session) {
    return { needsConfirmation: true, email }
  }

  if (partnerCodeError) {
    redirect(`/tableau-de-bord?code_error=${encodeURIComponent(partnerCodeError)}`)
  }
  redirect('/tableau-de-bord')
}

export async function connexion(formData: FormData) {
  const supabase = await createClient()
  const locale = await getLocale()

  const parsed = connexionSchema(locale).safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { email, password } = parsed.data

  const lock = await checkLoginLock(email)
  if (lock.locked) {
    return {
      error: t(
        locale,
        `Trop de tentatives. Réessaie dans ${lock.minutesLeft} minute${lock.minutesLeft > 1 ? 's' : ''}.`,
        `Too many attempts. Try again in ${lock.minutesLeft} minute${lock.minutesLeft > 1 ? 's' : ''}.`
      ),
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      await registerFailedLogin(email)
      return { error: t(locale, 'Email ou mot de passe incorrect', 'Incorrect email or password') }
    }
    if (error.message.includes('Email not confirmed')) {
      return {
        error: t(
          locale,
          "Ton email n'est pas encore confirmé. Vérifie ta boîte mail (et tes spams), ou renvoie l'email ci-dessous.",
          "Your email isn't confirmed yet. Check your inbox (and spam folder), or resend the confirmation email below."
        ),
        emailNotConfirmed: true,
        email,
      }
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

export async function renvoyerConfirmation(email: string) {
  const locale = await getLocale()
  const parsed = z.string().email().safeParse(email)
  if (!parsed.success) {
    return { error: t(locale, 'Email invalide', 'Invalid email') }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function verifierCodeMfa(code: string) {
  const supabase = await createClient()
  const locale = await getLocale()

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
  if (factorsError) return { error: factorsError.message }

  const factor = factors?.totp?.find(f => f.status === 'verified')
  if (!factor) return { error: t(locale, 'Aucun facteur de double authentification actif trouvé', 'No active two-factor authentication method found') }

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/tableau-de-bord')
}

export async function verifierCodeRecuperationMfa(code: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Session expirée, reconnecte-toi.', 'Session expired, please log in again.') }

  const admin = createAdminClient()
  const codeHash = hashRecoveryCode(code)
  const { data: match } = await admin
    .from('mfa_recovery_codes')
    .select('id')
    .eq('user_id', user.id)
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .maybeSingle()

  if (!match) return { error: t(locale, 'Code de secours invalide ou déjà utilisé', 'Invalid or already used recovery code') }

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
