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
import { programmerBasculeAnnuelle } from '@/lib/bascule-annuelle'

// Chaque partenaire écrit sa conclusion de son côté, en 2 questions
// ("qu'as-tu appris ?" / "qu'est-ce qui t'a surpris ?"), une fois que les
// deux ont répondu à toutes les questions. Quand les deux conclusions sont
// écrites, le module est révélé et le suivant se débloque. Une fois le
// module scellé, chacun·e peut encore modifier sa propre conclusion.
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
  if (!mod.reponses_partagees && !mod.revealed) {
    return { error: t(locale, 'Vous devez d’abord avoir tous les deux répondu à toutes les questions.', 'You both need to answer every question first.') }
  }

  const rows = [
    { couple_id: mod.couple_id, module_slug: mod.slug, user_id: user.id, question_slug: 'apprentissage', valeur: chiffrer(apprentissage) },
    { couple_id: mod.couple_id, module_slug: mod.slug, user_id: user.id, question_slug: 'surprise', valeur: chiffrer(surprise) },
  ]
  // Module déjà scellé : les règles de sécurité de la base refusent toute
  // modification d'une conclusion (sans erreur, 0 ligne modifiée). Le
  // serveur a vérifié que le module est celui du couple et que les lignes
  // sont celles de la personne connectée : on écrit avec la clé service.
  const client = mod.revealed ? admin : supabase
  const { data: ecrites, error } = await client
    .from('journal_entries')
    .upsert(rows, { onConflict: 'couple_id,module_slug,user_id,question_slug' })
    .select('question_slug')
  if (error) return { error: error.message }
  if ((ecrites ?? []).length < rows.length) return { error: t(locale, 'Ta conclusion n’a pas pu être enregistrée. Réessaie.', 'Your conclusion could not be saved. Please try again.') }
  after(() => marquerActivite(admin, mod.couple_id))

  // Module déjà scellé : chacun·e peut compléter sa conclusion après coup
  // (ex. après en avoir discuté), sans nouvel e-mail à l'autre.
  if (mod.revealed) {
    revalidatePath('/journal')
    revalidatePath(`/module/${moduleSlug}/revelation`)
    return { success: true, sealed: true }
  }

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

  after(async () => {
    // Pacte signé par les deux : l'abonnement mensuel passe d'office au
    // rendez-vous annuel à la fin du mois déjà payé, sans manipulation du
    // couple (annulable depuis Mon compte). Un échec n'empêche pas l'e-mail :
    // l'offre reste alors proposée sur la page Notre Pacte.
    let basculeAnnuelleLe: string | undefined
    if (sealed) {
      try {
        const res = await programmerBasculeAnnuelle(admin, mod.couple_id)
        if ('basculeLe' in res) basculeAnnuelleLe = res.basculeLe
      } catch (e) {
        console.error(`[bascule annuelle] couple ${mod.couple_id} : ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    await notifierPartenaire(sealed ? 'journal_complet' : 'journal_a_ton_tour', {
      moduleId: mod.id,
      moduleSlug: mod.slug,
      moduleTitre: modules.find(m => m.slug === mod.slug)?.titre ?? mod.slug,
      moduleTitreEn: modules.find(m => m.slug === mod.slug)?.titre_en,
      coupleId: mod.couple_id,
      auteurId: user.id,
      dernierModule: true,
      basculeAnnuelleLe,
    })
  })

  revalidatePath('/journal')
  revalidatePath('/tableau-de-bord')
  revalidatePath(`/module/${mod.slug}/revelation`)
  return { success: true, sealed }
}
