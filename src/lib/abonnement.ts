import type { CoupleAbonnement, Module, ModuleInfo } from '@/types'

// Accès payant actif : la période en cours n'est pas terminée, même si une
// résiliation a été demandée (cancel_at_period_end) — l'accès reste ouvert
// jusqu'à la fin de la période déjà payée, comme annoncé dans les CGV.
export function estAbonnementActif(couple: CoupleAbonnement | null | undefined): boolean {
  if (!couple) return false
  if (couple.subscription_status !== 'actif') return false
  if (!couple.subscription_current_period_end) return true
  return new Date(couple.subscription_current_period_end).getTime() > Date.now()
}

// Le compte est définitivement clos (13 mois sans accès payé écoulés) :
// plus aucune réactivation possible sur ce couple, il faut repartir de zéro.
// Calculé à la volée à partir de data_retention_until (le webhook la pose à
// la fin de l'accès + 13 mois) — compte_resilie_le n'est posé qu'une fois la
// tâche planifiée passée, mais le calcul ci-dessous est déjà vrai avant.
export function estCompteResilie(couple: CoupleAbonnement | null | undefined): boolean {
  if (!couple) return false
  if (couple.compte_resilie_le) return true
  if (!couple.data_retention_until) return false
  return new Date(couple.data_retention_until).getTime() <= Date.now()
}

// Un module payant reste consultable une fois révélé (« partie réalisée »)
// même après résiliation ; seul l'accès à de nouveaux modules payants est
// bloqué sans abonnement actif.
export function peutAccederModule(
  moduleInfo: Pick<ModuleInfo, 'free'>,
  moduleData: Pick<Module, 'revealed'> | null | undefined,
  couple: CoupleAbonnement | null | undefined
): boolean {
  if (moduleInfo.free) return true
  if (moduleData?.revealed) return true
  return estAbonnementActif(couple)
}
