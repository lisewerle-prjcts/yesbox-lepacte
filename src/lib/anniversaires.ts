import { NOCES } from '@/lib/noces'

// Nom des noces pour ce nombre d'années exactement (null s'il n'y en a pas
// dans la liste : on n'affiche pas celui d'une autre année).
function findMatiere(years: number): string | null {
  return NOCES[years]?.fr ?? null
}

export interface AnniversaireCouple {
  years: number
  matiere: string | null
  date: Date
}

export function getProchainAnniversaire(dateAnniversaire: string): AnniversaireCouple | null {
  const start = new Date(dateAnniversaire)
  if (isNaN(start.getTime())) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), start.getMonth(), start.getDate())
  if (next < today) {
    next = new Date(now.getFullYear() + 1, start.getMonth(), start.getDate())
  }

  const years = next.getFullYear() - start.getFullYear()
  if (years <= 0) return null

  return { years, matiere: findMatiere(years), date: next }
}

// Le dernier anniversaire déjà passé (ou aujourd'hui) — « l'anniversaire en cours ».
export function getAnniversaireActuel(dateAnniversaire: string): AnniversaireCouple | null {
  const start = new Date(dateAnniversaire)
  if (isNaN(start.getTime())) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let current = new Date(now.getFullYear(), start.getMonth(), start.getDate())
  if (current > today) {
    current = new Date(now.getFullYear() - 1, start.getMonth(), start.getDate())
  }

  const years = current.getFullYear() - start.getFullYear()
  if (years <= 0) return null

  return { years, matiere: findMatiere(years), date: current }
}
