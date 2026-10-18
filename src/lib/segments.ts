// Segments de l'admin (Actions manuelles > Envoyer un message à un segment) :
// une personne fait partie du segment si elle remplit TOUS les critères
// « AVEC » et AUCUN des critères « SANS ». Fonctions pures, utilisées à la
// fois dans le navigateur (compte en direct, export) et côté serveur (envoi,
// où le segment est recalculé à partir des données fraîches).

export interface PersonneSegment {
  id: string
  prenom: string | null
  nom: string | null
  email: string
  coupleNumero: number | null
  inscritLe: string | null
  /** Dernière connexion (auth), null si jamais connecté·e. */
  derniereConnexion: string | null
  /** Code gratuit utilisé par le couple à l'inscription. */
  code: string | null
  /** Date de fin (révélation) de chaque module terminé, par slug. */
  modulesTermines: Record<string, string | null>
  pacteSigneLe: string | null
  /** Abonnement résilié (résiliation demandée, expiré ou compte clos). */
  resilie: boolean
  resilieLe: string | null
  programmeTermine: boolean
  /** A accepté les e-mails de rappel (désinscription possible). */
  rappelsEmail: boolean
}

export type TypeCritere = 'code' | 'module_termine' | 'inactif' | 'pacte_signe' | 'resilie' | 'programme_termine'

export interface Critere {
  type: TypeCritere
  /** Code (code), slug du module (module_termine), nombre de jours (inactif). */
  valeur?: string
}

export interface FiltresSegment {
  avec: Critere[]
  sans: Critere[]
  /** Exclut les personnes qui ont refusé les rappels par e-mail. */
  respecterDesinscription: boolean
}

export const LIBELLES_CRITERES: Record<TypeCritere, string> = {
  code: 'Inscrit·e avec le code…',
  module_termine: 'A terminé le module…',
  inactif: 'Pas connecté·e depuis… jours',
  pacte_signe: 'A signé le pacte',
  resilie: 'A résilié l\'abonnement',
  programme_termine: 'A fini le programme initial (M1 à M9 + pacte signé)',
}

const JOUR = 24 * 60 * 60 * 1000

function remplit(p: PersonneSegment, c: Critere, maintenant: number): boolean {
  switch (c.type) {
    case 'code':
      return !!c.valeur && (p.code ?? '').toUpperCase() === c.valeur.trim().toUpperCase()
    case 'module_termine':
      return !!c.valeur && c.valeur in p.modulesTermines
    case 'inactif': {
      const jours = Number(c.valeur)
      if (!Number.isFinite(jours) || jours < 0) return false
      const reference = p.derniereConnexion ?? p.inscritLe
      if (!reference) return true
      return maintenant - new Date(reference).getTime() >= jours * JOUR
    }
    case 'pacte_signe':
      return !!p.pacteSigneLe
    case 'resilie':
      return p.resilie
    case 'programme_termine':
      return p.programmeTermine
  }
}

// Un critère sans valeur alors qu'il en exige une (code ou module non
// choisi, nombre de jours vide) est ignoré, pour ne pas vider le segment
// pendant la saisie.
export function critereComplet(c: Critere): boolean {
  if (c.type === 'code' || c.type === 'module_termine') return !!c.valeur?.trim()
  if (c.type === 'inactif') return c.valeur !== undefined && c.valeur !== '' && Number.isFinite(Number(c.valeur))
  return true
}

export function filtrerSegment(personnes: PersonneSegment[], filtres: FiltresSegment, maintenant = Date.now()): PersonneSegment[] {
  const avec = filtres.avec.filter(critereComplet)
  const sans = filtres.sans.filter(critereComplet)
  return personnes.filter(p =>
    (!filtres.respecterDesinscription || p.rappelsEmail) &&
    avec.every(c => remplit(p, c, maintenant)) &&
    !sans.some(c => remplit(p, c, maintenant))
  )
}
