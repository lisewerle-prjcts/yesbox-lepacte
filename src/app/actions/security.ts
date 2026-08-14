'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin, notifySecurityEvent } from '@/lib/admin-mail'
import type { createClient } from '@/lib/supabase/server'

const RECOVERY_EMAIL_KEY_PREFIX = 'admin_recovery_email::'

async function getRecoveryEmail(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('settings').select('value').eq('key', `${RECOVERY_EMAIL_KEY_PREFIX}${userId}`).single()
  return data?.value ?? null
}

export async function setRecoveryEmail(email: string) {
  const supabase = await assertAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!email.includes('@')) return { error: 'Email invalide' }

  await supabase.from('settings').upsert(
    { key: `${RECOVERY_EMAIL_KEY_PREFIX}${user.id}`, value: email },
    { onConflict: 'key' }
  )
  revalidatePath('/admin/securite')
  return { success: true }
}

export async function changerMotDePasse(currentPassword: string, newPassword: string) {
  const supabase = await assertAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Non authentifié' }
  if (newPassword.length < 8) return { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (reauthError) return { error: 'Mot de passe actuel incorrect' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  await notifySecurityEvent(await getRecoveryEmail(supabase, user.id), 'Mot de passe modifié — YES BOX Admin', 'Le mot de passe de ton compte admin YES BOX vient d\'être modifié. Si ce n\'est pas toi, contacte-nous immédiatement.')

  return { success: true }
}

export async function deconnecterAutresSessions() {
  const supabase = await assertAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) return { error: error.message }

  if (user) {
    await notifySecurityEvent(await getRecoveryEmail(supabase, user.id), 'Sessions déconnectées — YES BOX Admin', 'Toutes les autres sessions connectées à ton compte admin YES BOX ont été déconnectées à distance.')
  }

  return { success: true }
}

export async function demarrerActivationMfa() {
  const supabase = await assertAdmin()
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'YES BOX Admin' })
  if (error) return { error: error.message }
  return { success: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

export async function confirmerActivationMfa(factorId: string, code: string) {
  const supabase = await assertAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) return { error: 'Code invalide, réessaie.' }

  if (user) {
    await notifySecurityEvent(await getRecoveryEmail(supabase, user.id), 'Double authentification activée — YES BOX Admin', 'La double authentification (2FA) vient d\'être activée sur ton compte admin YES BOX.')
  }

  revalidatePath('/admin/securite')
  return { success: true }
}

export async function desactiverMfa(factorId: string, silent = false) {
  const supabase = await assertAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { error: error.message }

  if (user && !silent) {
    await notifySecurityEvent(await getRecoveryEmail(supabase, user.id), 'Double authentification désactivée — YES BOX Admin', 'La double authentification (2FA) vient d\'être désactivée sur ton compte admin YES BOX. Si ce n\'est pas toi, contacte-nous immédiatement.')
  }

  revalidatePath('/admin/securite')
  return { success: true }
}
