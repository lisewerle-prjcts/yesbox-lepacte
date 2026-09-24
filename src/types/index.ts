export type ModuleSlug = string
export type ModuleStatut = 'locked' | 'en_cours' | 'complete'
export type QuestionType = 'text' | 'choix' | 'choix_multiple' | 'echelle' | 'grille'

export interface Profile {
  id: string
  email: string
  prenom: string | null
  nom: string | null
  avatar_url: string | null
  couple_id: string | null
  role: 'initiateur' | 'partenaire' | null
  created_at: string
  updated_at: string
}

export type SubscriptionStatus = 'aucun' | 'actif' | 'incomplet' | 'expire' | 'resilie'

export interface Couple {
  id: string
  numero: number
  nom_couple: string | null
  date_anniversaire: string | null
  invite_token: string | null
  invite_token_expires_at: string | null
  invite_used: boolean
  pairing_code: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: SubscriptionStatus
  subscription_current_period_end: string | null
  subscription_cancel_at_period_end: boolean
  subscription_canceled_at: string | null
  data_retention_until: string | null
  compte_resilie_le: string | null
  acces_gratuit_expire_le: string | null
  code_parrainage: string | null
  parrain_couple_id: string | null
  parrainages_recompenses: number
  created_at: string
  updated_at: string
}

export type CoupleAbonnement = Pick<Couple,
  | 'id' | 'stripe_customer_id' | 'stripe_subscription_id' | 'subscription_status'
  | 'subscription_current_period_end' | 'subscription_cancel_at_period_end'
  | 'subscription_canceled_at' | 'data_retention_until' | 'compte_resilie_le'
  | 'acces_gratuit_expire_le'
>

export const ABONNEMENT_COLONNES =
  'id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, subscription_canceled_at, data_retention_until, compte_resilie_le, acces_gratuit_expire_le'

export type CoupleParrainage = Pick<Couple, 'id' | 'code_parrainage' | 'parrain_couple_id' | 'parrainages_recompenses'>

export const PARRAINAGE_COLONNES = 'id, code_parrainage, parrain_couple_id, parrainages_recompenses'

export interface Module {
  id: string
  couple_id: string
  slug: ModuleSlug
  statut: ModuleStatut
  revealed: boolean
  revealed_at: string | null
  completed_at: string | null
  created_at: string
}

export interface Reponse {
  id: string
  module_id: string
  user_id: string
  question_slug: string
  valeur: string | null
  created_at: string
  updated_at: string
}

export type ConclusionSlug = 'apprentissage' | 'surprise'

export interface JournalEntry {
  id: string
  couple_id: string
  module_slug: string
  user_id: string
  question_slug: ConclusionSlug
  valeur: string
  created_at: string
  updated_at: string
}

export interface Precommande {
  id: string
  prenom: string
  email: string
  adresse: string | null
  message: string | null
  created_at: string
}

export interface Question {
  slug: string
  type: QuestionType
  texte: string
  hint?: string
  options?: string[]
  /** Type "grille" : une ligne par élément à évaluer ; `options` sert d'en-têtes de colonnes. */
  lignes?: string[]
  /**
   * Type "grille" : les deux premières colonnes désignent la personne qui répond
   * ("Moi") puis l'autre ("Toi"). La révélation les remplace par les prénoms.
   */
  colonnesMoiToi?: boolean
  min?: number
  max?: number
  labelMin?: string
  labelMax?: string
  /** Traduction anglaise US par défaut de `texte` (contenu statique des modules). */
  texte_en?: string
  hint_en?: string
  options_en?: string[]
  lignes_en?: string[]
  labelMin_en?: string
  labelMax_en?: string
}

/** Libellés d'une question de fin de module (affichée à la révélation et dans le journal). */
export interface ConclusionTexte {
  label: string
  placeholder: string
  label_en?: string
  placeholder_en?: string
}

export interface ModuleInfo {
  slug: ModuleSlug
  n: number
  titre: string
  sousTitre: string
  description: string
  emoji: string
  free: boolean
  questions: Question[]
  /** Les 2 questions de fin de module, propres à ce module (sinon, CONCLUSION_PAR_DEFAUT). */
  conclusion?: Record<ConclusionSlug, ConclusionTexte>
  /** Traductions anglaises US par défaut (contenu statique des modules). */
  titre_en?: string
  sousTitre_en?: string
  description_en?: string
}
