import type { createAdminClient } from '@/lib/supabase/server'
import type { ModuleInfo } from '@/types'
import { hasAnsweredAll } from '@/lib/questions'

type AdminClient = ReturnType<typeof createAdminClient>

// Règles du jeu, appliquées côté serveur (le navigateur ne décide plus de
// rien) et verrouillées en base (cf. supabase/schema.sql, v16) :
//   - chacun·e répond seul·e ; les réponses de l'autre ne sont visibles
//     qu'une fois que LES DEUX ont répondu à toutes les questions
//     (modules.reponses_partagees) ;
//   - à partir de là, les réponses ne sont plus modifiables ;
//   - le module est révélé (et le suivant débloqué) quand les deux ont
//     écrit leur conclusion.

export interface ModuleCouple {
  id: string
  couple_id: string
  slug: string
  statut: string
  revealed: boolean
  reponses_partagees: boolean
}

interface ReponseBrute { module_id: string; user_id: string; question_slug: string; valeur: string | null }

// Module appartenant au couple de la personne (null sinon) : empêche d'agir
// sur le module d'un autre couple.
export async function moduleDuCouple(admin: AdminClient, userId: string, moduleId: string): Promise<ModuleCouple | null> {
  const [{ data: profile }, { data: mod }] = await Promise.all([
    admin.from('profiles').select('couple_id').eq('id', userId).single(),
    admin.from('modules').select('id, couple_id, slug, statut, revealed, reponses_partagees').eq('id', moduleId).maybeSingle(),
  ])
  if (!profile?.couple_id || !mod || mod.couple_id !== profile.couple_id) return null
  return mod as ModuleCouple
}

export interface EtatReponses<R> {
  mesReponses: R[]
  // Vide tant que les réponses ne sont pas partagées.
  reponsesPartenaire: R[]
  partenaire: { id: string; prenom: string | null } | null
  jaiTermine: boolean
  partenaireTermine: boolean
  partenaireACommence: boolean
  // Les deux ont répondu à tout, ou module révélé : réponses visibles et
  // verrouillées.
  reponsesPartagees: boolean
}

export async function etatReponses<R extends ReponseBrute = ReponseBrute>(
  admin: AdminClient,
  mod: ModuleCouple,
  userId: string,
  questions: ModuleInfo['questions'],
): Promise<EtatReponses<R>> {
  const [{ data: membres }, { data: reponses }] = await Promise.all([
    admin.from('profiles').select('id, prenom').eq('couple_id', mod.couple_id),
    admin.from('reponses').select('*').eq('module_id', mod.id),
  ])
  const partenaire = (membres ?? []).find(m => m.id !== userId) ?? null
  const toutes = (reponses ?? []) as R[]
  const mesReponses = toutes.filter(r => r.user_id === userId)
  const sesReponses = partenaire ? toutes.filter(r => r.user_id === partenaire.id) : []

  const jaiTermine = hasAnsweredAll(questions, mesReponses)
  const partenaireTermine = hasAnsweredAll(questions, sesReponses)
  let reponsesPartagees = mod.revealed || mod.reponses_partagees
  if (!reponsesPartagees && jaiTermine && partenaireTermine) {
    await admin.from('modules').update({ reponses_partagees: true }).eq('id', mod.id)
    reponsesPartagees = true
  }

  return {
    mesReponses,
    reponsesPartenaire: reponsesPartagees ? sesReponses : [],
    partenaire,
    jaiTermine,
    partenaireTermine,
    partenaireACommence: sesReponses.some(r => r.valeur),
    reponsesPartagees,
  }
}

// Révèle le module et débloque le suivant, uniquement si les deux ont
// répondu à tout ET écrit leur conclusion.
export async function revelerSiPret(admin: AdminClient, mod: ModuleCouple, ordreModules: string[]): Promise<boolean> {
  if (mod.revealed) return true
  if (!mod.reponses_partagees) return false

  const [{ data: membres }, { data: conclusions }] = await Promise.all([
    admin.from('profiles').select('id').eq('couple_id', mod.couple_id),
    admin.from('journal_entries').select('user_id, question_slug, valeur').eq('couple_id', mod.couple_id).eq('module_slug', mod.slug),
  ])
  if ((membres ?? []).length < 2) return false
  const conclusionFaite = (uid: string) => ['apprentissage', 'surprise'].every(slug =>
    (conclusions ?? []).some(c => c.user_id === uid && c.question_slug === slug && c.valeur?.trim())
  )
  if (!(membres ?? []).every(m => conclusionFaite(m.id))) return false

  await admin.from('modules').update({ revealed: true, revealed_at: new Date().toISOString() }).eq('id', mod.id)
  const idx = ordreModules.indexOf(mod.slug)
  if (idx >= 0 && idx < ordreModules.length - 1) {
    await admin.from('modules').update({ statut: 'en_cours' })
      .eq('couple_id', mod.couple_id)
      .eq('slug', ordreModules[idx + 1])
      .eq('statut', 'locked')
  }
  return true
}
