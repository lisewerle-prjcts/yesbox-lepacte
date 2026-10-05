// Bornes de la date du rendez-vous annuel (déblocage du module 10), fixée
// à la signature du pacte : entre 6 mois et 1 an plus tard, 1 an par défaut.
// Dates au format AAAA-MM-JJ.

function ajouterMois(depuis: Date, mois: number): string {
  const d = new Date(Date.UTC(depuis.getUTCFullYear(), depuis.getUTCMonth() + mois, depuis.getUTCDate()))
  return d.toISOString().slice(0, 10)
}

export function bornesRdvAnnuel(depuis: Date = new Date()) {
  return {
    min: ajouterMois(depuis, 6),
    max: ajouterMois(depuis, 12),
    parDefaut: ajouterMois(depuis, 12),
  }
}

// Prochaine date anniversaire du couple comprise dans les bornes, sinon null.
export function anniversaireDansBornes(dateAnniversaire: string | null, depuis: Date = new Date()): string | null {
  if (!dateAnniversaire) return null
  const [, mm, jj] = dateAnniversaire.split('-')
  if (!mm || !jj) return null
  const { min, max } = bornesRdvAnnuel(depuis)
  const annee = depuis.getUTCFullYear()
  for (const a of [annee, annee + 1]) {
    const candidat = `${a}-${mm}-${jj}`
    if (candidat >= min && candidat <= max) return candidat
  }
  return null
}
