// Bornes de la date du rendez-vous annuel (déblocage du module 10), fixée
// à la signature du pacte : entre 6 et 18 mois plus tard, 1 an par défaut.
// Dates au format AAAA-MM-JJ.

function ajouterMois(depuis: Date, mois: number): string {
  const d = new Date(Date.UTC(depuis.getUTCFullYear(), depuis.getUTCMonth() + mois, depuis.getUTCDate()))
  return d.toISOString().slice(0, 10)
}

export function bornesRdvAnnuel(depuis: Date = new Date()) {
  return {
    min: ajouterMois(depuis, 6),
    max: ajouterMois(depuis, 18),
    parDefaut: ajouterMois(depuis, 12),
  }
}

// Vraie date du calendrier (rejette par ex. un 30 février ou un 29 février
// hors année bissextile).
export function estDateValide(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = new Date(`${date}T00:00:00Z`)
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date
}

// Prochaine occurrence d'un jour / mois comprise entre min et max (AAAA-MM-JJ),
// sinon null (la plus proche quand la fenêtre de 12 mois contient deux dates possibles).
export function prochaineDateDansBornes(mois: number, jour: number, min: string, max: string): string | null {
  if (!Number.isInteger(mois) || !Number.isInteger(jour) || mois < 1 || mois > 12 || jour < 1 || jour > 31) return null
  const anneeMin = Number(min.slice(0, 4))
  for (const a of [anneeMin, anneeMin + 1]) {
    const candidat = `${a}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
    if (estDateValide(candidat) && candidat >= min && candidat <= max) return candidat
  }
  return null
}

// Prochaine date anniversaire du couple comprise dans les bornes, sinon null.
export function anniversaireDansBornes(dateAnniversaire: string | null, depuis: Date = new Date()): string | null {
  if (!dateAnniversaire) return null
  const [, mm, jj] = dateAnniversaire.split('-')
  if (!mm || !jj) return null
  const { min, max } = bornesRdvAnnuel(depuis)
  return prochaineDateDansBornes(Number(mm), Number(jj.slice(0, 2)), min, max)
}

// Prochaine Saint-Valentin (14 février) comprise dans les bornes, sinon null.
export function saintValentinDansBornes(depuis: Date = new Date()): string | null {
  const { min, max } = bornesRdvAnnuel(depuis)
  return prochaineDateDansBornes(2, 14, min, max)
}
