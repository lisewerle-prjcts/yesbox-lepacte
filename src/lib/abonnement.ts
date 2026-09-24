import type { CoupleAbonnement, Module, ModuleInfo } from '@/types'

// Accès payant (Stripe) actif : la période en cours n'est pas terminée,
// même si une résiliation a été demandée (cancel_at_period_end) — l'accès
// reste ouvert jusqu'à la fin de la période déjà payée, comme annoncé dans
// les CGV. Utilisé spécifiquement pour les décisions liées à la
// facturation (ex. bloquer un second abonnement Stripe, choisir comment
// créditer une récompense de parrainage).
export function estAbonnementActif(couple: CoupleAbonnement | null | undefined): boolean {
  if (!couple) return false
  if (couple.subscription_status !== 'actif') return false
  if (!couple.subscription_current_period_end) return true
  return new Date(couple.subscription_current_period_end).getTime() > Date.now()
}

// Accès gratuit actif (code testeur ou récompense de parrainage), sans lien
// avec Stripe.
export function aAccesGratuitActif(couple: CoupleAbonnement | null | undefined): boolean {
  if (!couple?.acces_gratuit_expire_le) return false
  return new Date(couple.acces_gratuit_expire_le).getTime() > Date.now()
}

// Accès complet à l'app : abonnement Stripe actif OU accès gratuit en
// cours (code testeur, mois offert par le parrainage). C'est ce qu'il faut
// utiliser pour toute décision d'accès (gating des modules, page /abonnement).
export function aAccesComplet(couple: CoupleAbonnement | null | undefined): boolean {
  return estAbonnementActif(couple) || aAccesGratuitActif(couple)
}

// Le compte est définitivement clos (18 mois sans accès payé écoulés) :
// plus aucune réactivation possible sur ce couple, il faut repartir de zéro.
// Calculé à la volée à partir de data_retention_until (le webhook la pose à
// la fin de l'accès + 18 mois) — compte_resilie_le n'est posé qu'une fois la
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
  return aAccesComplet(couple)
}
