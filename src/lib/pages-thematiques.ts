// Pages thématiques pour le référencement naturel : /jeu-de-couple,
// /therapie-de-couple et /pacte-de-couple. Chacune reprend tout l'accueil
// (AccueilClient), avec son propre titre, son introduction et une section de
// contenu propre juste après. Textes modifiables en mode édition (ids
// « theme.<slug>.… ») ; leur version anglaise par défaut est ajoutée à
// EN_CONTENT (cf. enDesPagesThematiques).

export interface Texte { fr: string; en: string }

export interface SectionThematique {
  titre: Texte
  paragraphes?: Texte[]
  liste?: Texte[]
}

export interface PageThematique {
  slug: 'jeu-de-couple' | 'therapie-de-couple' | 'pacte-de-couple'
  /** Titre affiché dans Google (balise <title>). */
  metaTitre: string
  /** Description affichée dans Google (160 caractères au plus). */
  metaDescription: string
  h1: Texte
  intro: Texte[]
  sections: SectionThematique[]
  /** Exemples de vraies questions des modules. */
  exemples?: { titre: Texte; questions: Texte[] }
  faq: { q: Texte; r: Texte }[]
}

const tx = (fr: string, en: string): Texte => ({ fr, en })

const URGENCES = tx(
  'Pour toute situation de violence, contactez le 3919 ou le numéro des urgences 17, 112 ou par SMS au 114 (contact gratuit).',
  'In any situation of violence, contact 3919 or the emergency numbers 17, 112, or text 114 (free of charge).',
)

export const PAGES_THEMATIQUES: PageThematique[] = [
  {
    slug: 'jeu-de-couple',
    metaTitre: 'Jeu de questions pour couple : se découvrir à deux',
    metaDescription: 'Un jeu de questions ludiques pour tous les couples : chacun·e répond de son côté, puis vous découvrez les réponses de l’autre et en parlez. Module 1 gratuit.',
    h1: tx('Le jeu de questions pour couple qui fait vraiment parler', 'The couples question game that really gets you talking'),
    intro: [
      tx(
        'Quel était le rêve de l’autre à 20 ans ? Qu’est-ce qui l’apaise vraiment quand ça ne va pas ? Vous pensez connaître les réponses… YES BOX – Le Pacte vous propose de le vérifier, à deux.',
        'What was your partner’s dream at 20? What really soothes them when things aren’t going well? You think you know the answers… YES BOX – Le Pacte invites you to find out, together.',
      ),
      tx(
        'Ensemble depuis 2 mois ou 20 ans, marié·es ou non : chacun·e répond de son côté, puis vous découvrez les réponses de l’autre et vous en parlez. Un jeu simple, sans gagnant ni perdant, pour mieux vous connaître et prendre soin de votre couple.',
        'Together for 2 months or 20 years, married or not: each of you answers on your own, then you discover each other’s answers and talk about them. A simple game, with no winner or loser, to get to know each other better and take care of your relationship.',
      ),
    ],
    sections: [
      {
        titre: tx('Comment se joue le jeu', 'How the game works'),
        liste: [
          tx('Chacun·e répond seul·e, sur son téléphone ou son ordinateur, sans voir les réponses de l’autre.', 'Each of you answers alone, on your phone or computer, without seeing the other’s answers.'),
          tx('Quand vous avez fini tous les deux, les réponses se dévoilent côte à côte.', 'When you have both finished, the answers are revealed side by side.'),
          tx('Vous en parlez, à votre rythme : un soir, un week-end ou une semaine.', 'You talk about them at your own pace: one evening, a weekend or a week.'),
          tx('Chacun·e écrit une courte conclusion, et le module suivant s’ouvre.', 'Each of you writes a short conclusion, and the next module opens.'),
        ],
      },
      {
        titre: tx('Pourquoi répondre chacun·e de son côté ?', 'Why answer separately?'),
        paragraphes: [
          tx(
            'Quand on répond à voix haute, on s’influence sans le vouloir : on adoucit, on devine ce que l’autre attend, on évite le sujet qui fâche. En répondant seul·e, chacun·e dit ce qu’il ou elle pense vraiment.',
            'When you answer out loud, you influence each other without meaning to: you soften things, guess what the other expects, avoid the touchy subject. Answering alone, each of you says what you really think.',
          ),
          tx(
            'La découverte des réponses devient alors le meilleur moment du jeu : des points communs qui font sourire, des surprises, et parfois un sujet dont vous n’aviez encore jamais parlé.',
            'Discovering the answers then becomes the best moment of the game: things in common that make you smile, surprises, and sometimes a topic you had never talked about before.',
          ),
        ],
      },
      {
        titre: tx('8 thèmes pour faire le tour de votre couple', '8 themes to explore your whole relationship'),
        liste: [
          tx('Toi et Moi : se (re)découvrir', 'You and Me: (re)discovering each other'),
          tx('Nous : votre histoire', 'Us: your story'),
          tx('Le quotidien : la vie commune', 'Everyday life: living together'),
          tx('Argent et projets', 'Money and plans'),
          tx('Famille et croyances', 'Family and beliefs'),
          tx('Émotions et communication', 'Emotions and communication'),
          tx('Tendresse et intimité', 'Affection and intimacy'),
          tx('Les disputes : désamorcer, grandir', 'Arguments: defusing them, growing together'),
        ],
        paragraphes: [
          tx(
            'À la fin, un pacte de couple à signer, à renouveler chaque année pour se redire oui, en conscience.',
            'At the end, a couple’s pact to sign, renewed every year to say yes again, mindfully.',
          ),
        ],
      },
      {
        titre: tx('Une soirée à deux, pas un test', 'An evening for two, not a test'),
        paragraphes: [
          tx(
            'Pas de score, pas de bonne réponse, et ni thérapeute ni intelligence artificielle n’analyse ce que vous écrivez. Vos réponses sont chiffrées et ne sont lues que par vous deux. Comptez 30 à 60 minutes à deux par module.',
            'No score, no right answer, and neither a therapist nor artificial intelligence analyzes what you write. Your answers are encrypted and read only by the two of you. Allow 30 to 60 minutes together per module.',
          ),
        ],
      },
    ],
    exemples: {
      titre: tx('Quelques questions du jeu', 'A few questions from the game'),
      questions: [
        tx('Quelle est ta définition du bonheur ?', 'What is your definition of happiness?'),
        tx('Qu’est-ce qui t’a plu chez l’autre, la toute première fois ?', 'What attracted you to your partner, the very first time?'),
        tx('Quel est le geste ou l’attention qui te touche le plus, au quotidien, de la part de l’autre ?', 'What gesture or thoughtful act from your partner touches you most in everyday life?'),
        tx('Es-tu plutôt économe ou dépensier·ère ?', 'Are you more of a saver or a spender?'),
        tx('Quelles sont les plus belles valeurs que tu as reçues ?', 'What are the most valuable things your family passed down to you?'),
        tx('Qu’est-ce qui t’apaise vraiment quand ça ne va pas : un câlin, du silence, parler, bouger… ?', 'What really soothes you when things aren’t going well: a hug, silence, talking, moving… ?'),
        tx('Quels petits gestes de tendresse te font fondre ?', 'What small gestures of affection melt your heart?'),
        tx('En dispute, quelle image te ressemble le plus : volcan, iceberg, porte qui claque, table de négociation ?', 'In an argument, which image fits you best: volcano, iceberg, slamming door, negotiating table?'),
      ],
    },
    faq: [
      {
        q: tx('Faut-il être en couple depuis longtemps pour jouer ?', 'Do you need to have been together for a long time to play?'),
        r: tx(
          'Non. YES BOX s’adresse à tous les couples, ensemble depuis 2 mois ou 20 ans, marié·es ou non. Les plus récents découvrent l’autre, les plus anciens se redécouvrent.',
          'No. YES BOX is for every couple, together for 2 months or 20 years, married or not. Newer couples discover each other, long-standing ones rediscover each other.',
        ),
      },
      {
        q: tx('Est-ce un jeu de cartes ?', 'Is it a card game?'),
        r: tx(
          'Non, c’est un programme en ligne : vous jouez sur votre téléphone ou votre ordinateur, chacun·e de son côté, sans rien à installer.',
          'No, it’s an online program: you play on your phone or computer, each on your own, with nothing to install.',
        ),
      },
      {
        q: tx('Combien ça coûte ?', 'How much does it cost?'),
        r: tx(
          'Le premier module est gratuit pour vous deux, sans carte bancaire. Le pack initial (les 8 modules et la signature du pacte) coûte ensuite 58 € en une fois, avec un an pour le réaliser.',
          'The first module is free for both of you, with no credit card. The starter pack (the 8 modules and signing the pact) then costs €58 once, with one year to complete it.',
        ),
      },
    ],
  },
  {
    slug: 'therapie-de-couple',
    metaTitre: 'Thérapie de couple ou programme à deux : par où commencer ?',
    metaDescription: 'Pas encore prêt·es à consulter ? YES BOX – Le Pacte aide tous les couples à se parler, à leur rythme. Un complément, pas une thérapie. Module 1 gratuit.',
    h1: tx('Thérapie de couple : et si vous commenciez par vous parler ?', 'Couples therapy: what if you started by talking to each other?'),
    intro: [
      tx(
        'Consulter un ou une thérapeute de couple est une vraie démarche, parfois indispensable. Mais tous les couples n’en ont pas besoin, ou pas tout de suite : souvent, il s’agit d’abord de se parler vraiment, de ce qui va bien comme de ce qui coince.',
        'Seeing a couples therapist is a real step, sometimes an essential one. But not every couple needs it, or not right away: often, the first step is to really talk to each other, about what works as well as what doesn’t.',
      ),
      tx(
        'YES BOX – Le Pacte est un programme en ligne de développement personnel pour tous les couples. Ce n’est pas une thérapie : c’est un espace pour échanger à deux, à votre rythme, sans tierce personne.',
        'YES BOX – Le Pacte is an online personal development program for every couple. It is not therapy: it is a space to talk as a couple, at your own pace, with no third party.',
      ),
    ],
    sections: [
      {
        titre: tx('Quand consulter un ou une professionnel·le', 'When to see a professional'),
        paragraphes: [
          tx(
            'Une thérapie de couple est recommandée quand la communication est rompue, quand une crise s’installe (infidélité, deuil, épuisement, désaccord sur un projet d’enfant…) ou quand les disputes deviennent destructrices. Un ou une thérapeute apporte un regard extérieur et des outils que YES BOX ne remplace pas.',
            'Couples therapy is recommended when communication has broken down, when a crisis sets in (infidelity, grief, burnout, disagreement about having a child…) or when arguments become destructive. A therapist brings an outside perspective and tools that YES BOX does not replace.',
          ),
          URGENCES,
        ],
      },
      {
        titre: tx('Ce que YES BOX apporte, avant ou à côté d’une thérapie', 'What YES BOX offers, before or alongside therapy'),
        liste: [
          tx('Des questions pour aborder les sujets qu’on remet toujours à plus tard : argent, familles, intimité, disputes.', 'Questions to tackle the topics you keep putting off: money, families, intimacy, arguments.'),
          tx('Des réponses écrites chacun·e de son côté, pour dire ce qu’on pense vraiment, sans être interrompu·e.', 'Answers written separately, so each of you can say what you really think, without being interrupted.'),
          tx('Une découverte des réponses à deux, pour en parler au calme.', 'Discovering the answers together, to talk about them calmly.'),
          tx('Un pacte de couple à signer, puis à renouveler chaque année.', 'A couple’s pact to sign, then renew every year.'),
        ],
      },
      {
        titre: tx('Un complément au travail en cabinet', 'A complement to work with a therapist'),
        paragraphes: [
          tx(
            'Si vous êtes déjà accompagné·es, YES BOX peut nourrir vos séances : vos réponses donnent des pistes concrètes à explorer avec votre thérapeute, si vous le souhaitez. Et si une discussion révèle une souffrance profonde, c’est peut-être le signe qu’il est temps de consulter.',
            'If you are already seeing someone, YES BOX can feed into your sessions: your answers give concrete leads to explore with your therapist, if you wish. And if a conversation reveals deep pain, it may be a sign that it’s time to seek help.',
          ),
        ],
      },
      {
        titre: tx('Sans jugement, en toute confidentialité', 'No judgment, fully confidential'),
        paragraphes: [
          tx(
            'Ni thérapeute ni intelligence artificielle n’analyse vos réponses. Elles sont chiffrées et ne sont lues que par vous deux.',
            'Neither a therapist nor artificial intelligence analyzes your answers. They are encrypted and read only by the two of you.',
          ),
        ],
      },
    ],
    faq: [
      {
        q: tx('YES BOX remplace-t-il une thérapie de couple ?', 'Does YES BOX replace couples therapy?'),
        r: tx(
          'Non. YES BOX n’est pas une thérapie et ne pose aucun diagnostic : c’est un programme pour se parler à deux. Si vous traversez une crise profonde, tournez-vous vers un·e professionnel·le.',
          'No. YES BOX is not therapy and makes no diagnosis: it is a program to talk as a couple. If you are going through a deep crisis, please reach out to a professional.',
        ),
      },
      {
        q: tx('Peut-on faire YES BOX pendant une thérapie ?', 'Can we do YES BOX during therapy?'),
        r: tx(
          'Oui, c’est même un bon complément : vous pouvez partager avec votre thérapeute ce que vous avez découvert, si vous le souhaitez.',
          'Yes, it’s actually a good complement: you can share what you discovered with your therapist, if you wish.',
        ),
      },
      {
        q: tx('Et si mon ou ma partenaire ne veut pas consulter ?', 'What if my partner doesn’t want to see a therapist?'),
        r: tx(
          'Un programme ludique à faire à la maison est souvent plus facile à proposer. Commencez par le module 1, gratuit pour vous deux : il permet de voir comment chacun·e se sent.',
          'A playful program to do at home is often easier to suggest. Start with module 1, free for both of you: it shows how each of you feels.',
        ),
      },
    ],
  },
  {
    slug: 'pacte-de-couple',
    metaTitre: 'Pacte de couple : écrire et signer vos engagements à deux',
    metaDescription: 'Écrivez votre pacte de couple après 8 modules de questions à deux, signez-le, puis renouvelez-le chaque année pour vous redire oui. Module 1 gratuit.',
    h1: tx('Le pacte de couple : vos engagements, écrits à deux', 'The couple’s pact: your commitments, written together'),
    intro: [
      tx(
        'Un pacte de couple, c’est un texte que vous écrivez ensemble et que vous signez tous les deux : ce qui compte pour vous, ce que vous voulez préserver, ce à quoi chacun·e s’engage pour l’autre.',
        'A couple’s pact is a text you write together and both sign: what matters to you, what you want to protect, what each of you commits to for the other.',
      ),
      tx(
        'Avec YES BOX – Le Pacte, il est l’aboutissement de 8 modules à faire à deux, que vous soyez ensemble depuis 2 mois ou 20 ans, marié·es ou non. Puis il se renouvelle chaque année, pour se redire oui, en conscience.',
        'With YES BOX – Le Pacte, it is the outcome of 8 modules done together, whether you have been together for 2 months or 20 years, married or not. Then it is renewed every year, to say yes again, mindfully.',
      ),
    ],
    sections: [
      {
        titre: tx('Un pacte qui se construit, module après module', 'A pact built module by module'),
        paragraphes: [
          tx(
            'À la fin de chaque module, chacun·e garde une idée pour le pacte : un rêve à soutenir, une qualité à ne jamais perdre de vue, une façon de mieux se disputer. Quand vient le moment d’écrire, la matière est déjà là.',
            'At the end of each module, each of you keeps an idea for the pact: a dream to support, a quality never to lose sight of, a better way to argue. When the time comes to write, the material is already there.',
          ),
        ],
      },
      {
        titre: tx('Ce que contient votre pacte', 'What your pact contains'),
        liste: [
          tx('Ce pour quoi chacun·e dit merci à l’autre.', 'What each of you thanks the other for.'),
          tx('Les principes de base de votre couple heureux.', 'The core principles of your happy relationship.'),
          tx('Ce que chacun·e s’engage à faire, ou à faire plus souvent, pour l’autre cette année.', 'What each of you commits to doing, or doing more often, for the other this year.'),
          tx('La date de votre rendez-vous annuel.', 'The date of your yearly date.'),
        ],
      },
      {
        titre: tx('Signé à deux, renouvelé chaque année', 'Signed together, renewed every year'),
        paragraphes: [
          tx(
            'Le pacte n’a pas de valeur juridique : sa force, c’est d’être choisi à deux. Une fois signé, il vous accompagne toute l’année. À la date que vous avez choisie, le module « Notre rendez-vous annuel » vous invite à faire le bilan et à renouveler vos engagements.',
            'The pact has no legal value: its strength is that you choose it together. Once signed, it stays with you all year. On the date you chose, the “Our yearly date” module invites you to take stock and renew your commitments.',
          ),
          tx(
            'À ne pas confondre avec le PACS : le pacte de couple YES BOX est un engagement personnel, sans démarche administrative, ouvert à tous les couples.',
            'Not to be confused with the French civil union (PACS): the YES BOX couple’s pact is a personal commitment, with no paperwork, open to every couple.',
          ),
        ],
      },
    ],
    faq: [
      {
        q: tx('Le pacte de couple a-t-il une valeur juridique ?', 'Does the couple’s pact have legal value?'),
        r: tx(
          'Non. Ce n’est ni un contrat ni un PACS : c’est un engagement personnel entre vous deux, sans démarche administrative.',
          'No. It is neither a contract nor a civil union: it is a personal commitment between the two of you, with no paperwork.',
        ),
      },
      {
        q: tx('Faut-il être marié·es ou pacsé·es ?', 'Do we need to be married or in a civil union?'),
        r: tx(
          'Non. Le pacte s’adresse à tous les couples, ensemble depuis 2 mois ou 20 ans, marié·es ou non.',
          'No. The pact is for every couple, together for 2 months or 20 years, married or not.',
        ),
      },
      {
        q: tx('Peut-on faire évoluer son pacte ?', 'Can our pact evolve?'),
        r: tx(
          'Oui : chaque année, le rendez-vous annuel vous invite à faire le bilan et à renouveler vos engagements (abonnement facultatif à 19 €/an, sans engagement).',
          'Yes: every year, the yearly date invites you to take stock and renew your commitments (optional subscription at €19/year, cancel anytime).',
        ),
      },
    ],
  },
]

export function pageThematique(slug: PageThematique['slug']): PageThematique {
  return PAGES_THEMATIQUES.find(p => p.slug === slug)!
}

// Identifiants EditableText de chaque texte d'une page.
export const idsPage = (slug: string) => ({
  h1: `theme.${slug}.h1`,
  intro: (i: number) => `theme.${slug}.intro.${i}`,
  sectionTitre: (i: number) => `theme.${slug}.section.${i}.titre`,
  sectionParagraphe: (i: number, j: number) => `theme.${slug}.section.${i}.p.${j}`,
  sectionListe: (i: number, j: number) => `theme.${slug}.section.${i}.liste.${j}`,
  exemplesTitre: `theme.${slug}.exemples.titre`,
  exemple: (i: number) => `theme.${slug}.exemples.${i}`,
  faqQ: (i: number) => `theme.${slug}.faq.${i}.q`,
  faqR: (i: number) => `theme.${slug}.faq.${i}.r`,
})

// Version anglaise par défaut de tous les textes des pages (EN_CONTENT).
export function enDesPagesThematiques(): Record<string, string> {
  const en: Record<string, string> = {}
  for (const p of PAGES_THEMATIQUES) {
    const ids = idsPage(p.slug)
    en[ids.h1] = p.h1.en
    p.intro.forEach((t, i) => { en[ids.intro(i)] = t.en })
    p.sections.forEach((s, i) => {
      en[ids.sectionTitre(i)] = s.titre.en
      s.paragraphes?.forEach((t, j) => { en[ids.sectionParagraphe(i, j)] = t.en })
      s.liste?.forEach((t, j) => { en[ids.sectionListe(i, j)] = t.en })
    })
    if (p.exemples) {
      en[ids.exemplesTitre] = p.exemples.titre.en
      p.exemples.questions.forEach((t, i) => { en[ids.exemple(i)] = t.en })
    }
    p.faq.forEach((f, i) => { en[ids.faqQ(i)] = f.q.en; en[ids.faqR(i)] = f.r.en })
  }
  return en
}
