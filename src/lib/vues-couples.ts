// Classement des couples pour les chiffres clés de la vue d'ensemble et le
// filtre de Couples & progression (/admin/couples?vue=…) : une seule règle,
// pour que chaque chiffre corresponde exactement à la liste affichée.

// Un couple « en pause » n'a enregistré ni réponse ni conclusion depuis plus
// de 5 jours.
export const PAUSE_APRES_JOURS = 5

export type VueCouples = 'actifs' | 'en_pause' | 'pas_commences' | 'solo' | 'pactes_signes' | 'parcours_initial' | 'parcours_rdv'

export const LIBELLES_VUES: Record<VueCouples, string> = {
  actifs: 'Couples actifs',
  en_pause: `En pause depuis plus de ${PAUSE_APRES_JOURS} jours`,
  pas_commences: 'Couples pas encore commencés',
  solo: 'Inscrit·es en solo',
  pactes_signes: 'Pactes signés',
  parcours_initial: 'Couples — parcours initial',
  parcours_rdv: 'Couples — parcours rendez-vous annuel',
}

export function estVueCouples(v: unknown): v is VueCouples {
  return typeof v === 'string' && v in LIBELLES_VUES
}

// Vues dont fait partie un couple. Un couple a « commencé » dès sa première
// réponse ou conclusion : derniere_activite_le est alors posée après la
// création du couple (elle reste vide, ou égale à la date de création, tant
// que rien n'est enregistré). Comptes résiliés : seulement les vues de
// parcours.
export function vuesDuCouple(
  couple: { created_at: string; pacte_signe_le: string | null; derniere_activite_le: string | null; compte_resilie_le: string | null },
  nbMembres: number,
  programmeFini: boolean,
  maintenant = Date.now(),
): VueCouples[] {
  const vues: VueCouples[] = [programmeFini ? 'parcours_rdv' : 'parcours_initial']
  if (couple.compte_resilie_le) return vues
  if (nbMembres === 1) return [...vues, 'solo']
  if (nbMembres !== 2) return vues
  if (couple.pacte_signe_le) return [...vues, 'pactes_signes']
  const activite = couple.derniere_activite_le ? new Date(couple.derniere_activite_le).getTime() : null
  const commence = activite !== null && activite > new Date(couple.created_at).getTime()
  if (!commence) return [...vues, 'pas_commences']
  return [...vues, activite! >= maintenant - PAUSE_APRES_JOURS * 24 * 60 * 60 * 1000 ? 'actifs' : 'en_pause']
}
