import type { ModuleInfo } from '@/types'

export const MODULES: ModuleInfo[] = [
  {
    slug: 'valeurs',
    titre: 'Nos Valeurs',
    description: 'Découvrez ce qui vous unit profondément et bâtissez votre socle commun.',
    emoji: '💎',
    couleur: '#D63E7A',
    questions: [
      {
        slug: 'valeur_principale',
        texte: 'Quelle est la valeur la plus importante dans ta vie en ce moment ?',
        type: 'texte',
      },
      {
        slug: 'importance_famille',
        texte: 'À quel point la famille est-elle centrale dans tes priorités ?',
        type: 'echelle',
        min: 1,
        max: 10,
      },
      {
        slug: 'liberte_vs_securite',
        texte: 'Entre liberté et sécurité, lequel prime pour toi ?',
        type: 'choix',
        options: ['La liberté avant tout', 'Un équilibre entre les deux', 'La sécurité avant tout'],
      },
      {
        slug: 'valeur_couple',
        texte: 'Quelle valeur souhaites-tu que votre couple incarne ?',
        type: 'texte',
      },
    ],
  },
  {
    slug: 'communication',
    titre: 'Notre Communication',
    description: 'Construisez un langage commun et des rituels de dialogue solides.',
    emoji: '💬',
    couleur: '#7B61FF',
    questions: [
      {
        slug: 'style_communication',
        texte: 'Comment décris-tu ton style de communication dans le couple ?',
        type: 'choix',
        options: ['Direct et franc', 'Doux et diplomate', 'J\'ai besoin de temps pour m\'exprimer', 'Expressif et émotionnel'],
      },
      {
        slug: 'gestion_conflit',
        texte: 'Quand il y a un désaccord, quelle est ta réaction naturelle ?',
        type: 'texte',
      },
      {
        slug: 'frequence_discussion',
        texte: 'À quelle fréquence voudrais-tu avoir des vraies conversations de fond ?',
        type: 'choix',
        options: ['Tous les jours', 'Quelques fois par semaine', 'Une fois par semaine', 'Une fois par mois'],
      },
      {
        slug: 'besoin_communication',
        texte: 'Quel est ton besoin principal en matière de communication dans la relation ?',
        type: 'texte',
      },
    ],
  },
  {
    slug: 'intimite',
    titre: 'Notre Intimité',
    description: 'Explorez vos besoins affectifs, physiques et émotionnels en toute bienveillance.',
    emoji: '❤️',
    couleur: '#FF6B6B',
    questions: [
      {
        slug: 'langage_amour',
        texte: 'Quel est ton principal langage de l\'amour ?',
        type: 'choix',
        options: ['Les mots d\'affirmation', 'Le temps de qualité', 'Les cadeaux', 'Les services rendus', 'Le contact physique'],
      },
      {
        slug: 'besoin_affectif',
        texte: 'De quoi as-tu le plus besoin de ton/ta partenaire au quotidien ?',
        type: 'texte',
      },
      {
        slug: 'intimite_physique',
        texte: 'Quelle importance accordes-tu à l\'intimité physique dans la relation ?',
        type: 'echelle',
        min: 1,
        max: 10,
      },
      {
        slug: 'moment_connexion',
        texte: 'Quel rituel voudrais-tu instaurer pour vous reconnecter ?',
        type: 'texte',
      },
    ],
  },
  {
    slug: 'finances',
    titre: 'Nos Finances',
    description: 'Alignez vos visions et habitudes financières pour avancer ensemble.',
    emoji: '💰',
    couleur: '#2ECC71',
    questions: [
      {
        slug: 'rapport_argent',
        texte: 'Comment décrirais-tu ton rapport à l\'argent ?',
        type: 'choix',
        options: ['Économe et prudent·e', 'Équilibré·e', 'Dépensier·ère et profiteur·euse de la vie', 'Investisseur·euse'],
      },
      {
        slug: 'gestion_finances_couple',
        texte: 'Comment imagines-tu la gestion des finances dans votre couple ?',
        type: 'choix',
        options: ['Compte commun total', 'Comptes séparés + charges communes', 'Mélange des deux', 'À décider ensemble'],
      },
      {
        slug: 'objectif_financier',
        texte: 'Quel est ton principal objectif financier dans les 5 prochaines années ?',
        type: 'texte',
      },
      {
        slug: 'tabou_argent',
        texte: 'Est-ce qu\'il y a un sujet financier qu\'il te semble difficile d\'aborder ?',
        type: 'texte',
      },
    ],
  },
  {
    slug: 'projets',
    titre: 'Nos Projets',
    description: 'Dessinez ensemble l\'avenir que vous voulez construire.',
    emoji: '🚀',
    couleur: '#F39C12',
    questions: [
      {
        slug: 'projet_1an',
        texte: 'Quel est le projet le plus important pour toi dans l\'année à venir ?',
        type: 'texte',
      },
      {
        slug: 'projet_5ans',
        texte: 'Où te vois-tu dans 5 ans, dans ta vie personnelle et professionnelle ?',
        type: 'texte',
      },
      {
        slug: 'reve_commun',
        texte: 'Quel est le plus grand rêve que tu aimerais réaliser avec ton/ta partenaire ?',
        type: 'texte',
      },
      {
        slug: 'compromis_projets',
        texte: 'Sur quoi serais-tu prêt·e à faire des compromis pour les projets de votre couple ?',
        type: 'texte',
      },
    ],
  },
  {
    slug: 'famille',
    titre: 'Notre Famille',
    description: 'Partagez vos visions sur la famille, les enfants et les relations élargies.',
    emoji: '🏡',
    couleur: '#1ABC9C',
    questions: [
      {
        slug: 'vision_famille',
        texte: 'Quelle est ta vision de la famille idéale ?',
        type: 'texte',
      },
      {
        slug: 'enfants',
        texte: 'Quelle est ta vision concernant les enfants ?',
        type: 'choix',
        options: ['Je veux des enfants', 'Je ne veux pas d\'enfants', 'Je suis ouvert·e mais sans conviction forte', 'J\'ai déjà des enfants et c\'est suffisant'],
      },
      {
        slug: 'belle_famille',
        texte: 'Comment souhaites-tu que votre couple se positionne par rapport à vos familles respectives ?',
        type: 'texte',
      },
      {
        slug: 'education',
        texte: 'Quelles valeurs éducatives te tiennent à cœur ?',
        type: 'texte',
      },
    ],
  },
  {
    slug: 'croissance',
    titre: 'Notre Croissance',
    description: 'Engagez-vous mutuellement dans votre développement personnel et commun.',
    emoji: '🌱',
    couleur: '#9B59B6',
    questions: [
      {
        slug: 'croissance_personnelle',
        texte: 'Quel aspect de toi-même veux-tu développer cette année ?',
        type: 'texte',
      },
      {
        slug: 'soutien_attendu',
        texte: 'Quel type de soutien attends-tu de ton/ta partenaire dans ta croissance personnelle ?',
        type: 'texte',
      },
      {
        slug: 'apprentissage_couple',
        texte: 'Qu\'est-ce que tu veux apprendre ou vivre ensemble en tant que couple ?',
        type: 'texte',
      },
      {
        slug: 'engagement_pacte',
        texte: 'Quelle est la chose la plus importante que tu t\'engages à apporter à cette relation ?',
        type: 'texte',
      },
    ],
  },
]

export function getModuleBySlug(slug: string): ModuleInfo | undefined {
  return MODULES.find((m) => m.slug === slug)
}

export function getModuleIndex(slug: string): number {
  return MODULES.findIndex((m) => m.slug === slug)
}
