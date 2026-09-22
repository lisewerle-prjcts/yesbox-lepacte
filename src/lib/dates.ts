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
