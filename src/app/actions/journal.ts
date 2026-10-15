'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { consentementManquant } from '@/lib/consentement'
import { moduleDuCouple, revelerSiPret, MODULE_PACTE } from '@/lib/progression'
import { notifierPartenaire } from '@/lib/notifications-module'
import { marquerActivite } from '@/lib/activite'
import { chiffrer } from '@/lib/chiffrement'
import { bornesRdvAnnuel, estDateValide } from '@/lib/rdv-annuel'

// Chaque partenaire écrit sa conclusion de son côté, en 2 questions
// ("qu'as-tu appris ?" / "qu'est-ce qui t'a surpris ?"), une fois que les
// deux ont répondu à toutes les questions. Quand les deux conclusions sont
// écrites, le module est révélé et le suivant se débloque.
// `_coupleId` est ignoré : le couple est déduit du module, côté serveur.
export async function sauvegarderConclusion(
  _coupleId: string,
  moduleId: string,
  moduleSlug: string,
  apprentissage: string,
  surprise: string
) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (await consentementManquant(supabase, user.id)) return { error: t(locale, 'Ton consentement est nécessaire pour enregistrer tes réponses.', 'Your consent is required to save your answers.') }

  const admin = createAdminClient()
  const mod = await moduleDuCouple(admin, user.id, moduleId)
  if (!mod || mod.slug !== moduleSlug) return { error: t(locale, 'Module introuvable', 'Module not found') }
  if (mod.revealed) return { error: t(locale, 'Ce module est déjà révélé.', 'This module has already been revealed.') }
  if (!mod.reponses_partagees) {
    return { error: t(locale, 'Vous devez d’abord avoir tous les deux répondu à toutes les questions.', 'You both need to answer every question first.') }
  }

  const rows = [
    { couple_id: mod.couple_id, module_slug: mod.slug, user_id: user.id, question_slug: 'apprentissage', valeur: chiffrer(apprentissage) },
    { couple_id: mod.couple_id, module_slug: mod.slug, user_id: user.id, question_slug: 'surprise', valeur: chiffrer(surprise) },
  ]
  const { error } = await supabase
    .from('journal_entries')
    .upsert(rows, { onConflict: 'couple_id,module_slug,user_id,question_slug' })
  if (error) return { error: error.message }
  after(() => marquerActivite(admin, mod.couple_id))

  const modules = await getEffectiveModules()
  const ordre = modules.map(m => m.slug)
  const sealed = await revelerSiPret(admin, mod, ordre)

  // Prévient l'autre par e-mail : à son tour d'écrire sa conclusion, ou
  // module scellé et suivant débloqué.
  after(() => notifierPartenaire(sealed ? 'journal_complet' : 'journal_a_ton_tour', {
    moduleId: mod.id,
    moduleSlug: mod.slug,
    moduleTitre: modules.find(m => m.slug === mod.slug)?.titre ?? mod.slug,
    moduleTitreEn: modules.find(m => m.slug === mod.slug)?.titre_en,
    coupleId: mod.couple_id,
    auteurId: user.id,
    dernierModule: ordre.indexOf(mod.slug) === ordre.length - 1,
  }))

  revalidatePath('/journal')
  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${moduleSlug}/revelation`)
  return { success: true, sealed }
}

// Module 9 : chaque membre signe le pacte (au lieu d'écrire une conclusion),
// une fois que les deux ont répondu à toutes les questions. La date du
// rendez-vous annuel choisie à la signature est celle du couple (la
// dernière signature fait foi). Quand les deux ont signé, le module est
// terminé et le pacte daté.
export async function signerPacteModule(moduleId: string, dateRdvAnnuel: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (await consentementManquant(supabase, user.id)) return { error: t(locale, 'Ton consentement est nécessaire pour enregistrer tes réponses.', 'Your consent is required to save your answers.') }

  const admin = createAdminClient()
  const mod = await moduleDuCouple(admin, user.id, moduleId)
  if (!mod || mod.slug !== MODULE_PACTE) return { error: t(locale, 'Module introuvable', 'Module not found') }
  if (mod.revealed) return { error: t(locale, 'Votre pacte est déjà signé.', 'Your pact is already signed.') }
  if (!mod.reponses_partagees) {
    return { error: t(locale, 'Vous devez d’abord avoir tous les deux répondu à toutes les questions.', 'You both need to answer every question first.') }
  }

  const { min, max } = bornesRdvAnnuel()
  if (!estDateValide(dateRdvAnnuel) || dateRdvAnnuel < min || dateRdvAnnuel > max) {
    return { error: t(locale, 'Choisis une date entre 6 et 18 mois à partir d’aujourd’hui.', 'Pick a date between 6 and 18 months from today.') }
  }

  const maintenant = new Date().toISOString()
  const { error } = await supabase
    .from('journal_entries')
    .upsert(
      { couple_id: mod.couple_id, module_slug: mod.slug, user_id: user.id, question_slug: 'signature', valeur: chiffrer(maintenant) },
      { onConflict: 'couple_id,module_slug,user_id,question_slug' },
    )
  if (error) return { error: error.message }
  const { error: erreurRdv } = await admin.from('couples').update({ rdv_annuel_le: dateRdvAnnuel }).eq('id', mod.couple_id)
  if (erreurRdv) return { error: erreurRdv.message }
  after(() => marquerActivite(admin, mod.couple_id))

  const modules = await getEffectiveModules()
  const ordre = modules.map(m => m.slug)
  const sealed = await revelerSiPret(admin, mod, ordre)
  if (sealed) {
    await admin.from('couples').update({ pacte_signe_par: user.id })
      .eq('id', mod.couple_id).is('pacte_signe_par', null)
  }

  after(() => notifierPartenaire(sealed ? 'journal_complet' : 'journal_a_ton_tour', {
    moduleId: mod.id,
    moduleSlug: mod.slug,
    moduleTitre: modules.find(m => m.slug === mod.slug)?.titre ?? mod.slug,
    moduleTitreEn: modules.find(m => m.slug === mod.slug)?.titre_en,
    coupleId: mod.couple_id,
    auteurId: user.id,
    dernierModule: true,
  }))

  revalidatePath('/journal')
  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${mod.slug}/revelation`)
  return { success: true, sealed }
}
