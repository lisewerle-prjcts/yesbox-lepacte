export function ajouterMois(date: Date, mois: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + mois)
  return d.toISOString()
}

// Accès gratuit "illimité" (codes testeurs sans durée) : une vraie valeur
// null serait ambiguë avec "aucun accès gratuit" (cf. aAccesGratuitActif).
// Doit rester identique à la valeur posée par la fonction SQL
// utiliser_code_gratuit (supabase/schema.sql, v12).
export const ACCES_GRATUIT_ILLIMITE_ISO = '2999-01-01T00:00:00.000Z'

// Date du jour à Paris (AAAA-MM-JJ), pour les dates de fin incluses saisies
// dans l'admin (ex. codes_gratuits.actif_jusqu_au).
export function aujourdhuiParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

// Date de fin incluse (AAAA-MM-JJ) dépassée ? null = sans date de fin.
export function dateFinPassee(finIncluse: string | null | undefined): boolean {
  return !!finIncluse && aujourdhuiParis() > finIncluse
}
