export type ModuleSlug =
  | 'partenaire1'
  | 'partenaire2'
  | 'couple'
  | 'quotidien'
  | 'projets'
  | 'famille'
  | 'communication'
  | 'disputes'
  | 'cdd'
  | 'bac'
export type ModuleStatut = 'locked' | 'en_cours' | 'complete'
export type QuestionType = 'text' | 'choix' | 'choix_multiple' | 'echelle'

export interface Profile {
  id: string
  email: string
  prenom: string | null
  avatar_url: string | null
  couple_id: string | null
  role: 'initiateur' | 'partenaire' | null
  intro_vue: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Couple {
  id: string
  nom_couple: string | null
  date_anniversaire: string | null
  prenom_partenaire1: string | null
  prenom_partenaire2: string | null
  invite_token: string | null
  invite_token_expires_at: string | null
  invite_used: boolean
  a_paye: boolean
  paye_at: string | null
  stripe_customer_id: string | null
  stripe_checkout_session_id: string | null
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  couple_id: string
  slug: ModuleSlug
  cycle: number
  statut: ModuleStatut
  revealed: boolean
  revealed_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ModuleScore {
  id: string
  module_id: string
  user_id: string
  score: number
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

export interface JournalEntry {
  id: string
  couple_id: string
  module_slug: string
  contenu: string
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
  /** Texte par défaut, utilisé quand aucune variante par rôle n'est définie. */
  texte: string
  /** Variante affichée à la personne dont le profil a role === 'initiateur'. */
  texteInitiateur?: string
  /** Variante affichée à la personne dont le profil a role === 'partenaire'. */
  textePartenaire?: string
  hint?: string
  options?: string[]
  min?: number
  max?: number
  labelMin?: string
  labelMax?: string
}

export interface ModuleInfo {
  slug: ModuleSlug
  n: number
  titre: string
  sousTitre: string
  description: string
  emoji: string
  free: boolean
  /** Module rejouable chaque année (module 10 · BAC love). */
  annuel?: boolean
  /** Emplacement de texte affiché avant les questions — à compléter. */
  introTexte: string
  /** Emplacement de texte affiché après les questions — à compléter. */
  outroTexte: string
  questions: Question[]
}
