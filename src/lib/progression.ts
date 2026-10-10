import type { createAdminClient } from '@/lib/supabase/server'
import type { ModuleInfo } from '@/types'
import { hasAnsweredAll } from '@/lib/questions'
import { getEffectiveModules } from '@/lib/modules-effective'

type AdminClient = ReturnType<typeof createAdminClient>

export const MODULE_PACTE = 'engagement'
export const MODULE_RDV_ANNUEL = 'renouvellement'

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
  await realignerProgression(admin, mod.couple_id, ordreModules)
  return true
}

// Remet la progression d'un couple dans l'ordre du parcours : le premier
// module non révélé est ouvert, et tout autre module non révélé ouvert en
// avance (ex. « Les disputes » débloqué avant « Émotions et communication »
// quand l'ordre était faux) est reverrouillé. Les réponses déjà saisies sont
// conservées et réapparaissent quand le module se rouvre. Le module 10
// (rendez-vous annuel) n'est pas concerné : il s'ouvre à sa date.
// Avec `ouvrir: false`, seuls les modules ouverts en avance sont
// reverrouillés (l'ouverture reste faite par le tableau de bord, qui vérifie
// d'abord que le compte n'est pas résilié).
// Renvoie true si un module a changé de statut.
export async function realignerProgression(
  admin: AdminClient, coupleId: string, ordreModules?: string[], { ouvrir = true }: { ouvrir?: boolean } = {},
): Promise<boolean> {
  const ordre = (ordreModules ?? (await getEffectiveModules()).map(m => m.slug)).filter(slug => slug !== MODULE_RDV_ANNUEL)
  const { data: mods } = await admin.from('modules').select('id, slug, statut, revealed').eq('couple_id', coupleId)
  if (!mods?.length) return false

  const parSlug = new Map(mods.map(m => [m.slug, m]))
  const courant = ordre.find(slug => parSlug.has(slug) && !parSlug.get(slug)!.revealed)

  const aOuvrir = ouvrir && courant && parSlug.get(courant)!.statut === 'locked' ? [parSlug.get(courant)!.id] : []
  const aVerrouiller = ordre
    .filter(slug => slug !== courant)
    .map(slug => parSlug.get(slug))
    .filter(m => m && !m.revealed && m.statut !== 'locked')
    .map(m => m!.id)

  if (aVerrouiller.length) {
    await admin.from('modules').update({ statut: 'locked' }).in('id', aVerrouiller).eq('revealed', false)
  }
  if (aOuvrir.length) {
    await admin.from('modules').update({ statut: 'en_cours' }).in('id', aOuvrir).eq('statut', 'locked')
  }
  return aOuvrir.length > 0 || aVerrouiller.length > 0
}

// Ouvre le premier module d'un couple dont aucun module n'est ouvert ni
// révélé (initialiser_modules_couple crée tous les modules verrouillés) :
// sans ça, un nouveau couple n'a rien à commencer. Renvoie true si un
// module a été ouvert.
export async function ouvrirPremierModuleSiBesoin(admin: AdminClient, coupleId: string): Promise<boolean> {
  const { data: mods } = await admin.from('modules').select('slug, statut, revealed').eq('couple_id', coupleId)
  if (!mods?.length || mods.some(m => m.statut !== 'locked' || m.revealed)) return false
  const premier = (await getEffectiveModules())[0]?.slug
  if (!premier) return false
  const { data } = await admin.from('modules').update({ statut: 'en_cours' })
    .eq('couple_id', coupleId).eq('slug', premier).eq('statut', 'locked').select('id')
  return !!data?.length
}

// Ouvre le module 10 (rendez-vous annuel) une fois arrivée la date fixée à
// la signature du pacte. Renvoie true si le module a été ouvert.
export async function ouvrirRdvAnnuelSiDate(admin: AdminClient, coupleId: string): Promise<boolean> {
  const { data: couple } = await admin.from('couples').select('rdv_annuel_le').eq('id', coupleId).single()
  if (!couple?.rdv_annuel_le) return false
  const aujourdhui = new Date().toISOString().slice(0, 10)
  if (couple.rdv_annuel_le > aujourdhui) return false
  const { data } = await admin.from('modules').update({ statut: 'en_cours' })
    .eq('couple_id', coupleId).eq('slug', MODULE_RDV_ANNUEL).eq('statut', 'locked').select('id')
  return !!data?.length
}
