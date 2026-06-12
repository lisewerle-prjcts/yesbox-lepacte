export type ModuleSlug =
  | 'valeurs'
  | 'communication'
  | 'intimite'
  | 'finances'
  | 'projets'
  | 'famille'
  | 'croissance'

export type ModuleStatut = 'locked' | 'en_cours' | 'complete'

export interface Profile {
  id: string
  email: string
  prenom: string | null
  avatar_url: string | null
  couple_id: string | null
  role: 'initiateur' | 'partenaire' | null
  created_at: string
  updated_at: string
}

export interface Couple {
  id: string
  nom_couple: string | null
  date_anniversaire: string | null
  invite_token: string | null
  invite_token_expires_at: string | null
  invite_used: boolean
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  couple_id: string
  slug: ModuleSlug
  statut: ModuleStatut
  score_partenaire1: number | null
  score_partenaire2: number | null
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

export interface PacteItem {
  id: string
  couple_id: string
  module_slug: string
  contenu: string
  signe_partenaire1: boolean
  signe_partenaire2: boolean
  created_at: string
}

export interface ModuleInfo {
  slug: ModuleSlug
  titre: string
  description: string
  emoji: string
  couleur: string
  questions: Question[]
}

export interface Question {
  slug: string
  texte: string
  type: 'echelle' | 'texte' | 'choix'
  options?: string[]
  min?: number
  max?: number
}
