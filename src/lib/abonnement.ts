import type { CoupleAbonnement, Module, ModuleInfo } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

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

// Le compte a été clos par l'ancienne règle de conservation (réponses
// effacées un an après la fin de l'accès payé) : plus aucune réactivation
// possible sur ce couple, il faut repartir de zéro. Depuis la règle des
// 24 mois d'inactivité (src/lib/conservation.ts), les comptes inactifs sont
// effacés entièrement et plus aucun compte n'est clos de cette façon.
export function estCompteResilie(couple: CoupleAbonnement | null | undefined): boolean {
  return !!couple?.compte_resilie_le
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

// Formule de l'abonnement Stripe (mensuel / annuel) et date de bascule
// programmée vers l'annuel. Lues à part : si les colonnes manquent encore en
// base, le reste de la page fonctionne (formule inconnue = traitée comme
// mensuelle, la seule formule existant avant le rendez-vous annuel).
export interface FormuleCouple {
  formule: 'mensuel' | 'annuel' | null
  /** Fin du mois en cours, date à laquelle l'abonnement passe à 19 €/an. */
  annuelPrevuLe: string | null
}

export async function lireFormule(client: SupabaseClient, coupleId: string): Promise<FormuleCouple> {
  const { data, error } = await client.from('couples').select('subscription_formule, subscription_annuel_prevu_le').eq('id', coupleId).maybeSingle()
  if (error || !data) return { formule: null, annuelPrevuLe: null }
  return {
    formule: (data.subscription_formule as FormuleCouple['formule']) ?? null,
    annuelPrevuLe: (data.subscription_annuel_prevu_le as string | null) ?? null,
  }
}

// Offre « Pacte – notre rendez-vous annuel » : proposée une fois le pacte
// signé, sauf si elle est déjà active ou programmée, si le compte est clos
// ou si le couple bénéficie d'un accès gratuit sans abonnement payant.
export function offreRdvAnnuel(
  couple: CoupleAbonnement | null | undefined,
  { formule, annuelPrevuLe }: FormuleCouple,
  pacteSigne: boolean
): { afficher: boolean; mensuelEnCours: boolean } {
  const payant = estAbonnementActif(couple)
  const annuelActif = payant && formule === 'annuel'
  const mensuelEnCours = payant && formule !== 'annuel'
  const gratuitSeul = !payant && aAccesGratuitActif(couple)
  const dejaProgramme = mensuelEnCours && !!annuelPrevuLe
  return {
    afficher: pacteSigne && !annuelActif && !dejaProgramme && !gratuitSeul && !estCompteResilie(couple),
    mensuelEnCours,
  }
}
