// Types, limites et mise en forme des avis, utilisables côté navigateur
// (formulaire /avis, accueil). La logique serveur est dans ./avis.ts.

export const PRENOM_AVIS_MAX = 40
export const TEXTE_AVIS_MIN = 10
export const TEXTE_AVIS_MAX = 1500

// Avis affichés sur l'accueil (les plus récents), et repris tels quels dans
// les données structurées.
export const AVIS_ACCUEIL = 8

export type StatutAvis = 'en_attente' | 'publie' | 'refuse'

export interface AvisPublie {
  id: string
  prenom: string
  /** 1er jour du mois où le couple a commencé (AAAA-MM-JJ). */
  debutMois: string
  note: number
  texte: string
  publieLe: string
}

export interface ResumeAvis {
  avis: AvisPublie[]
  /** Moyenne arrondie au dixième, null sans avis publié. */
  moyenne: number | null
  nombre: number
}

// « octobre 2026 » / « October 2026 ».
export function formaterMoisAvis(debutMois: string, locale: 'fr' | 'en') {
  return new Date(`${debutMois.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
