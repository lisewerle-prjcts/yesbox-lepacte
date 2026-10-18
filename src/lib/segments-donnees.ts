import type { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { MODULE_RDV_ANNUEL, entreesDeFin } from '@/lib/progression'
import { dechiffrerLignes } from '@/lib/chiffrement'
import type { PersonneSegment } from '@/lib/segments'

type AdminClient = ReturnType<typeof createAdminClient>

// Dernière connexion de chaque compte (auth), par identifiant.
export async function dernieresConnexions(admin: AdminClient): Promise<Record<string, string | null>> {
  const resultat: Record<string, string | null> = {}
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users.length) break
    for (const u of data.users) resultat[u.id] = u.last_sign_in_at ?? null
    if (data.users.length < 1000) break
  }
  return resultat
}

// Modules terminés de chaque couple, avec leur date de fin : un module est
// terminé quand il est révélé ET que les deux partenaires ont écrit leur
// conclusion (signé, pour le pacte). Une révélation forcée depuis l'admin
// sans conclusions ne compte donc pas. Date de fin = date de révélation
// (à défaut, celle de la dernière conclusion).
export async function modulesTerminesParCouple(admin: AdminClient): Promise<Map<string, Record<string, string | null>>> {
  const [{ data: modules }, { data: membres }, { data: journal }] = await Promise.all([
    admin.from('modules').select('couple_id, slug, revealed_at').eq('revealed', true),
    admin.from('profiles').select('id, couple_id').not('couple_id', 'is', null),
    admin.from('journal_entries').select('couple_id, user_id, module_slug, question_slug, valeur, updated_at').in('question_slug', ['apprentissage', 'surprise', 'signature']),
  ])

  const membresParCouple = new Map<string, string[]>()
  for (const m of membres ?? []) membresParCouple.set(m.couple_id!, [...(membresParCouple.get(m.couple_id!) ?? []), m.id])
  // Clé couple|module|personne|question → date de la conclusion non vide.
  const conclusions = new Map<string, string | null>()
  for (const j of dechiffrerLignes(journal)) {
    if (j.valeur?.trim()) conclusions.set(`${j.couple_id}|${j.module_slug}|${j.user_id}|${j.question_slug}`, j.updated_at)
  }

  const resultat = new Map<string, Record<string, string | null>>()
  for (const m of modules ?? []) {
    const ids = membresParCouple.get(m.couple_id) ?? []
    if (ids.length < 2) continue
    const cles = ids.flatMap(uid => entreesDeFin(m.slug).map(q => `${m.couple_id}|${m.slug}|${uid}|${q}`))
    if (!cles.every(c => conclusions.has(c))) continue
    const derniere = cles.map(c => conclusions.get(c)).filter((d): d is string => !!d).sort().at(-1) ?? null
    resultat.set(m.couple_id, { ...(resultat.get(m.couple_id) ?? {}), [m.slug]: m.revealed_at ?? derniere })
  }
  return resultat
}

// Programme initial fini : modules 1 à 9 terminés et pacte signé par les
// deux (le module 10, rendez-vous annuel, vient un an plus tard).
export function programmeInitialTermine(slugs: string[], termines: Record<string, string | null>, pacteSigneLe: string | null) {
  const initiaux = slugs.filter(s => s !== MODULE_RDV_ANNUEL)
  return !!pacteSigneLe && initiaux.length > 0 && initiaux.every(s => s in termines)
}

// Toutes les personnes, comptes admin compris, avec ce qu'il faut pour les
// filtrer par segment.
export async function chargerPersonnesSegment(admin: AdminClient): Promise<PersonneSegment[]> {
  const [{ data: profiles }, { data: couples }, modulesParCouple, { data: codes }, connexions, effectiveModules] = await Promise.all([
    admin.from('profiles').select('id, prenom, nom, email, couple_id, created_at, rappels_email'),
    admin.from('couples').select('id, numero, pacte_signe_le, subscription_status, subscription_cancel_at_period_end, subscription_canceled_at, compte_resilie_le'),
    modulesTerminesParCouple(admin),
    admin.from('codes_gratuits_utilisations').select('couple_id, codes_gratuits(code)'),
    dernieresConnexions(admin),
    getEffectiveModules(),
  ])
  const slugs = effectiveModules.map(m => m.slug)

  const coupleParId = new Map((couples ?? []).map(c => [c.id, c]))
  const codeParCouple = new Map<string, string>()
  for (const u of codes ?? []) {
    const lie = u.codes_gratuits as { code?: string } | { code?: string }[] | null
    const code = Array.isArray(lie) ? lie[0]?.code : lie?.code
    if (code) codeParCouple.set(u.couple_id, code)
  }

  return (profiles ?? []).map(p => {
    const couple = p.couple_id ? coupleParId.get(p.couple_id) : undefined
    const modulesTermines = (p.couple_id && modulesParCouple.get(p.couple_id)) || {}
    const resilie = !!couple && (
      couple.subscription_cancel_at_period_end ||
      couple.subscription_status === 'resilie' ||
      couple.subscription_status === 'expire' ||
      !!couple.subscription_canceled_at ||
      !!couple.compte_resilie_le
    )
    return {
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      email: p.email,
      coupleNumero: couple?.numero ?? null,
      inscritLe: p.created_at,
      derniereConnexion: connexions[p.id] ?? null,
      code: p.couple_id ? codeParCouple.get(p.couple_id) ?? null : null,
      modulesTermines,
      pacteSigneLe: couple?.pacte_signe_le ?? null,
      resilie,
      resilieLe: resilie ? couple?.subscription_canceled_at ?? couple?.compte_resilie_le ?? null : null,
      programmeTermine: programmeInitialTermine(slugs, modulesTermines, couple?.pacte_signe_le ?? null),
      rappelsEmail: p.rappels_email !== false,
    }
  })
}
