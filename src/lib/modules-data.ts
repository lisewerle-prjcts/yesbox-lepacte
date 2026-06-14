import type { ModuleInfo } from '@/types'

export const MODULES: ModuleInfo[] = [
  {
    slug: 'moi', n: 1,
    titre: 'Moi et toi',
    sousTitre: 'Bilan personnel',
    description: 'Avant de former un couple, tu appartiens à un modèle. On commence par toi.',
    emoji: '🪞', free: true,
    questions: [
      { slug: 'caractere', type: 'text', texte: 'Si tes ami·es devaient décrire ton caractère, que diraient-ils ?', hint: 'Trois mots, ou trois phrases. Comme tu le sens.' },
      { slug: 'passion', type: 'text', texte: "Qu'est-ce qui te passionne vraiment, en ce moment ?", hint: 'Ce qui te fait perdre la notion du temps.' },
      { slug: 'bonheur', type: 'choix', texte: 'Pour toi, le bonheur ressemble le plus à…', options: ["Un moment de calme, seul·e ou à deux", "Une grande tablée qui rit", "Un projet qui avance", "L'imprévu, l'aventure"] },
      { slug: 'heureux', type: 'echelle', texte: "Aujourd'hui, sur une échelle de 1 à 10, es-tu heureux·se ?", min: 1, max: 10, labelMin: 'Pas vraiment', labelMax: 'Pleinement' },
      { slug: 'plaisirs', type: 'text', texte: 'Quels sont tes petits plaisirs du quotidien ?', hint: 'Les minuscules choses qui réparent une journée.' },
    ],
  },
  {
    slug: 'toi', n: 2,
    titre: 'Toi et moi',
    sousTitre: "Ce que je connais de l'autre",
    description: "On croit connaître l'autre par cœur. Cette séance révèle les angles morts, avec tendresse.",
    emoji: '👁️', free: false,
    questions: [
      { slug: 'souvenir', type: 'text', texte: 'Quel est, selon toi, le plus beau souvenir de votre couple ?', hint: 'Celui qui te revient en premier.' },
      { slug: 'admire', type: 'text', texte: "Qu'est-ce que tu admires le plus chez l'autre ?", hint: "Sois précis·e — pas juste « tout »." },
      { slug: 'ressource', type: 'choix', texte: "Quand l'autre va mal, ce dont il/elle a le plus besoin, c'est…", options: ["Qu'on l'écoute sans rien résoudre", "Qu'on l'aide à trouver une solution", "Qu'on le/la laisse seul·e un moment", "Un câlin, sans mots"] },
      { slug: 'craintes', type: 'choix_multiple', texte: "Selon toi, qu'est-ce qui inquiète le plus l'autre pour l'avenir ?", options: ["L'argent", "La santé des proches", "Notre équilibre à deux", "Le travail / la carrière", "Devenir parent", "Le temps qui passe"] },
      { slug: 'surprise', type: 'text', texte: "Une chose que tu aimerais encore découvrir sur l'autre ?", hint: '' },
    ],
  },
  {
    slug: 'nous', n: 3,
    titre: 'Nous',
    sousTitre: 'Notre couple',
    description: "On dessine le « nous » : ce qu'on a construit, ce qu'on protège, ce qu'on veut bâtir.",
    emoji: '💑', free: false,
    questions: [
      { slug: 'force', type: 'text', texte: 'Quelle est la plus grande force de votre couple ?', hint: '' },
      { slug: 'rituel', type: 'text', texte: 'Quel rituel à vous deux ne sacrifieriez-vous jamais ?', hint: '' },
      { slug: 'tabou', type: 'text', texte: "Y a-t-il un sujet que vous évitez d'aborder ?", hint: "Tu n'as pas à le partager si tu ne veux pas encore." },
      { slug: 'reve', type: 'text', texte: 'Quel est votre plus grand rêve commun ?', hint: '' },
    ],
  },
  {
    slug: 'communication', n: 4,
    titre: 'Parlons-nous',
    sousTitre: 'Styles & besoins',
    description: 'Les vrais outils, simples et testés : écoute active, non-verbal, moments-clés.',
    emoji: '💬', free: false,
    questions: [
      { slug: 'style', type: 'choix', texte: "Quand un sujet est difficile, tu préfères…", options: ["En parler tout de suite, tant que c'est frais", "Attendre le bon moment, dans le calme", "Écrire pour mettre de l'ordre dans mes idées", "Attendre que ça passe"] },
      { slug: 'ecoute', type: 'echelle', texte: 'Je me sens vraiment écouté·e par mon/ma partenaire.', min: 1, max: 10, labelMin: 'Rarement', labelMax: 'Toujours' },
      { slug: 'besoin', type: 'text', texte: "Quand tu as besoin de parler, de quoi as-tu le plus besoin de l'autre ?", hint: '' },
      { slug: 'nondit', type: 'text', texte: "Y a-t-il une chose que tu n'as jamais réussi à lui dire ?", hint: "Tu peux être vague — l'essentiel c'est de le reconnaître." },
    ],
  },
  {
    slug: 'conflits', n: 5,
    titre: 'Les conflits',
    sousTitre: 'Désamorcer, grandir',
    description: 'La méthode en 3 temps : laisser sortir l\'émotion, reformuler, repositiver.',
    emoji: '⚡', free: false,
    questions: [
      { slug: 'reaction', type: 'choix', texte: "Lors d'une dispute, ta réaction naturelle est de…", options: ["Monter dans les tours et tout dire", "Me murer dans le silence", "Chercher un compromis immédiatement", "Fuir la situation (sortir, changer de sujet)"] },
      { slug: 'corps', type: 'text', texte: 'Comment vis-tu une dispute, dans ton corps ?', hint: 'Tension, pleurs, besoin d\'air, de silence…' },
      { slug: 'apres', type: 'text', texte: 'Qu\'est-ce qui aide à réparer après une dispute ?', hint: 'Un geste, un mot, un rituel de réconciliation.' },
      { slug: 'ligne_rouge', type: 'text', texte: 'Ta ligne rouge dans un conflit — ce qui est inacceptable pour toi ?', hint: '' },
    ],
  },
  {
    slug: 'engagement', n: 6,
    titre: 'Le Pacte',
    sousTitre: 'Vœux, CDD, renouvellement',
    description: "L'aboutissement : vos vœux, votre CDD de couple, et votre rendez-vous annuel.",
    emoji: '📜', free: false,
    questions: [
      { slug: 'voeux', type: 'text', texte: 'Que promets-tu, vraiment ?', hint: "Pas les formules toutes faites. Ce que tu veux vraiment tenir." },
      { slug: 'cdd_article1', type: 'text', texte: 'Article 1 — Notre engagement mutuel. Comment le formulerais-tu ?', hint: '' },
      { slug: 'cdd_valeur', type: 'text', texte: "Article 2 — La valeur la plus importante de notre couple, c'est…", hint: '' },
      { slug: 'cdd_projet', type: 'text', texte: 'Article 3 — Notre grand projet des 12 prochains mois est…', hint: '' },
    ],
  },
  {
    slug: 'renouvellement', n: 7,
    titre: 'Le Renouvellement',
    sousTitre: 'Le module qui fait durer',
    description: 'Le 7ᵉ module, à part : des tips concrets pour durer, et l\'évaluation annuelle de votre pacte.',
    emoji: '🌱', free: false,
    questions: [
      { slug: 'geste', type: 'text', texte: 'Un petit geste à s\'offrir régulièrement, toute l\'année ?', hint: '' },
      { slug: 'evolution', type: 'text', texte: 'Qu\'est-ce qui a changé en vous depuis votre premier module ?', hint: '' },
      { slug: 'satisfaction', type: 'echelle', texte: 'Cette année, votre couple vous a rendu heureux·se à quel point ?', min: 1, max: 10, labelMin: 'Difficile', labelMax: 'Épanoui·e' },
      { slug: 'reengagement', type: 'text', texte: 'Si vous deviez ajouter un article à votre Pacte cette année, ce serait…', hint: '' },
    ],
  },
]

export function getModuleBySlug(slug: string): ModuleInfo | undefined {
  return MODULES.find(m => m.slug === slug)
}
