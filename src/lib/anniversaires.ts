// Noms traditionnels des « noces » par nombre d'années, pour proposer un petit
// rituel symbolique le jour de l'anniversaire de couple.
const NOCES: Record<number, string> = {
  1: 'coton', 2: 'cuir', 3: 'froment', 4: 'cire', 5: 'bois',
  6: 'chypre', 7: 'laine', 8: 'coquelicot', 9: 'faïence', 10: 'étain',
  11: 'corail', 12: 'soie', 13: 'muguet', 14: 'plomb', 15: 'cristal',
  16: 'saphir', 17: 'rose', 18: 'turquoise', 19: 'cretonne', 20: 'porcelaine',
  21: 'opale', 22: 'bronze', 23: 'béryl', 24: 'satin', 25: 'argent',
  26: 'jade', 27: 'acajou', 28: 'nickel', 29: 'velours', 30: 'perle',
  31: 'basane', 32: 'cuivre', 33: 'porphyre', 34: 'ambre', 35: 'rubis',
  36: 'mousseline', 37: 'papier', 38: 'mercure', 39: 'crêpe', 40: 'émeraude',
  41: 'fer', 42: 'nacre', 43: 'flanelle', 44: 'topaze', 45: 'vermeil',
  46: 'lavande', 47: 'cachemire', 48: 'améthyste', 49: 'cèdre', 50: 'or',
  55: 'orchidée', 60: 'diamant', 65: 'fer', 70: 'platine', 75: 'albâtre', 80: 'chêne',
}

// Nom des noces pour ce nombre d'années exactement (null s'il n'y en a pas
// dans la liste : on n'affiche pas celui d'une autre année).
function findMatiere(years: number): string | null {
  return NOCES[years] ?? null
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
