import type { createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
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

// Toutes les personnes (hors comptes admin) avec ce qu'il faut pour les
// filtrer par segment. Un module est « terminé » quand il est révélé (les
// deux partenaires l'ont conclu) ; le programme est fini quand tous les
// modules, rendez-vous annuel compris, le sont.
export async function chargerPersonnesSegment(admin: AdminClient): Promise<PersonneSegment[]> {
  const [{ data: profiles }, { data: couples }, { data: modules }, { data: codes }, connexions, effectiveModules] = await Promise.all([
    admin.from('profiles').select('id, prenom, nom, email, couple_id, created_at, is_admin, rappels_email'),
    admin.from('couples').select('id, numero, pacte_signe_le, subscription_status, subscription_cancel_at_period_end, subscription_canceled_at, compte_resilie_le'),
    admin.from('modules').select('couple_id, slug, revealed, revealed_at').eq('revealed', true),
    admin.from('codes_gratuits_utilisations').select('couple_id, codes_gratuits(code)'),
    dernieresConnexions(admin),
    getEffectiveModules(),
  ])
  const slugs = effectiveModules.map(m => m.slug)

  const coupleParId = new Map((couples ?? []).map(c => [c.id, c]))
  const modulesParCouple = new Map<string, Record<string, string | null>>()
  for (const m of modules ?? []) {
    const termines = modulesParCouple.get(m.couple_id) ?? {}
    termines[m.slug] = m.revealed_at
    modulesParCouple.set(m.couple_id, termines)
  }
  const codeParCouple = new Map<string, string>()
  for (const u of codes ?? []) {
    const lie = u.codes_gratuits as { code?: string } | { code?: string }[] | null
    const code = Array.isArray(lie) ? lie[0]?.code : lie?.code
    if (code) codeParCouple.set(u.couple_id, code)
  }

  return (profiles ?? []).filter(p => !p.is_admin).map(p => {
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
      programmeTermine: slugs.length > 0 && slugs.every(s => s in modulesTermines),
      rappelsEmail: p.rappels_email !== false,
    }
  })
}
