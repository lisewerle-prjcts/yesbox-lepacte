import { createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { enregistrerParrainage } from '@/lib/parrainage'
import { checkLoginLock, registerFailedLogin, clearLoginAttempts } from '@/lib/rate-limit'

// Ces fonctions reçoivent un userId sans le vérifier : elles ne doivent
// être appelées que depuis le serveur, après avoir authentifié la personne
// (ou juste après son inscription). Elles vivent volontairement hors de
// src/app/actions/ : toute fonction exportée d'un fichier 'use server'
// devient une action appelable depuis le navigateur avec n'importe quels
// arguments.

export async function creerCoupleSolo(userId: string, codeParrainage?: string | null) {
  const admin = createAdminClient()

  const { data: couple, error: coupleError } = await admin
    .from('couples')
    .insert({})
    .select()
    .single()

  if (coupleError) return { error: coupleError.message }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ couple_id: couple.id, role: 'initiateur' })
    .eq('id', userId)

  if (profileError) return { error: profileError.message }

  await admin.rpc('initialiser_modules_couple', { p_couple_id: couple.id })
  await admin.rpc('renumeroter_couples')

  if (codeParrainage) {
    await enregistrerParrainage(admin, codeParrainage, couple.id)
  }

  return { success: true, couple }
}

export async function rejoindreCoupleParCode(userId: string, code: string) {
  const admin = createAdminClient()
  const locale = await getLocale()

  const cleanCode = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{5}$/.test(cleanCode)) {
    return { error: t(locale, 'Le code doit contenir 5 lettres/chiffres', 'The code must contain 5 letters/digits') }
  }

  // Limite les essais pour empêcher de deviner un code de couple par force brute
  // (même mécanique et même table que le verrouillage de la connexion).
  const cleRateLimit = `code-couple:${userId}`
  const lock = await checkLoginLock(cleRateLimit)
  if (lock.locked) {
    return { error: t(locale, `Trop d'essais. Réessaie dans ${lock.minutesLeft} min.`, `Too many attempts. Try again in ${lock.minutesLeft} min.`) }
  }

  const { data, error } = await admin.rpc('rejoindre_couple_via_code', {
    p_code: cleanCode,
    p_user_id: userId,
  })

  if (error) return { error: error.message }
  if (!data.success) {
    await registerFailedLogin(cleRateLimit)
    return { error: data.error }
  }

  await clearLoginAttempts(cleRateLimit)
  return { success: true, coupleId: data.couple_id }
}
