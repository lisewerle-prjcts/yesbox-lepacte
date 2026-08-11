// Noms traditionnels des « noces » par nombre d'années, pour proposer un petit
// rituel symbolique le jour de l'anniversaire de couple.
const NOCES: Record<number, string> = {
  1: 'coton', 2: 'cuir', 3: 'froment', 4: 'cire', 5: 'bois',
  6: 'chypre', 7: 'laine', 8: 'coquelicot', 9: 'faïence', 10: 'étain',
  11: 'corail', 12: 'soie', 13: 'muguet', 14: 'plomb', 15: 'cristal',
  16: 'saphir', 17: 'rose', 18: 'turquoise', 19: 'cretonne', 20: 'porcelaine',
  21: 'opale', 22: 'bronze', 23: 'béryl', 24: 'satin', 25: 'argent',
  30: 'perle', 35: 'rubis', 40: 'émeraude', 45: 'vermeil', 50: 'or',
  55: 'orchidée', 60: 'diamant', 65: 'fer', 70: 'platine', 75: 'albâtre', 80: 'chêne',
}

const ANNEES_CONNUES = Object.keys(NOCES).map(Number).sort((a, b) => a - b)

export interface ProchainAnniversaire {
  years: number
  matiere: string
  date: Date
}

export function getProchainAnniversaire(dateAnniversaire: string): ProchainAnniversaire | null {
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

  const matiere = NOCES[years] || NOCES[[...ANNEES_CONNUES].reverse().find(y => y <= years) ?? 1]

  return { years, matiere, date: next }
}
