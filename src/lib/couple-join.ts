import { createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { enregistrerParrainage } from '@/lib/parrainage'
import { ouvrirPremierModuleSiBesoin } from '@/lib/progression'
import { checkLoginLock, registerFailedLogin, clearLoginAttempts } from '@/lib/rate-limit'

// Ces fonctions reçoivent un userId sans le vérifier : elles ne doivent
// être appelées que depuis le serveur, après avoir authentifié la personne
// (ou juste après son inscription). Elles vivent volontairement hors de
// src/app/actions/ : toute fonction exportée d'un fichier 'use server'
// devient une action appelable depuis le navigateur avec n'importe quels
// arguments.

// Le champ « Code de parrainage ou code promo » de l'inscription accepte
// les deux : on essaie d'abord le code comme code de parrainage (seulement
// pour un nouveau couple), puis comme code gratuit (Admin > Codes gratuits).
// Best-effort : un code invalide ne bloque jamais l'inscription.
export async function appliquerCodeInscription(coupleId: string, code: string, nouveauCouple: boolean) {
  const clean = code.trim()
  if (!clean) return
  const admin = createAdminClient()
  if (nouveauCouple && await enregistrerParrainage(admin, clean, coupleId)) return
  await admin.rpc('utiliser_code_gratuit', { p_code: clean, p_couple_id: coupleId })
}

// Vérifié avant de créer le compte, pour afficher une erreur dans le
// formulaire : le code doit être un code de parrainage existant, ou un code
// gratuit actif qui n'a pas atteint son nombre maximum d'utilisations.
export async function codeInscriptionValide(code: string) {
  const clean = code.trim().toUpperCase()
  if (!clean) return true
  const admin = createAdminClient()

  const { data: parrain } = await admin.from('couples').select('id').eq('code_parrainage', clean).maybeSingle()
  if (parrain) return true

  const { data: gratuit } = await admin.from('codes_gratuits').select('usages, usages_max')
    .eq('code', clean).eq('actif', true).maybeSingle()
  return !!gratuit && gratuit.usages < gratuit.usages_max
}

export async function creerCoupleSolo(userId: string, codeAvantage?: string | null) {
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
  await ouvrirPremierModuleSiBesoin(admin, couple.id)
  await admin.rpc('renumeroter_couples')

  if (codeAvantage) {
    await appliquerCodeInscription(couple.id, codeAvantage, true)
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
