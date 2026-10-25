import { variablesDuTexte } from './rendu'

// Catalogue de tous les e-mails automatiques envoyés aux couples, classés
// par famille. Chaque modèle a une version française et anglaise ; l'admin
// peut les modifier (Admin > Messages & e-mails, réglages
// « modele_email::<clé>::<langue> »), sinon c'est le texte ci-dessous qui
// part. Format du texte : voir ./rendu.ts.

export type FamilleEmail = 'inscription' | 'relances' | 'modules' | 'mensuels' | 'anniversaires' | 'abonnement'

export const FAMILLES: { cle: FamilleEmail; nom: string; description: string }[] = [
  { cle: 'inscription', nom: 'Inscription & compte', description: 'Confirmation d’adresse, bienvenue, invitation du ou de la partenaire, mot de passe.' },
  { cle: 'relances', nom: 'Relances (inactivité, effacement des données)', description: 'Parcours en pause depuis 10 jours, avertissement avant l’effacement d’un compte inactif.' },
  { cle: 'modules', nom: 'Fins de module & dévoilement des réponses', description: 'Envoyés à l’autre membre du couple à chaque étape d’un module et du pacte.' },
  { cle: 'mensuels', nom: 'Rendez-vous mensuels & bilan annuel', description: 'Un e-mail par mois une fois le pacte signé, et l’annonce du rendez-vous annuel.' },
  { cle: 'anniversaires', nom: 'Anniversaires', description: 'Anniversaire de couple (le jour J, un conseil différent chaque année) et de mariage (une semaine avant). Chaque envoi est validé dans Vue d’ensemble > Tâches.' },
  { cle: 'abonnement', nom: 'Abonnement & cartes cadeaux', description: 'Renouvellement à 19 €/an, passage à l’abonnement annuel, cartes cadeaux.' },
]

export interface ContenuEmail { objet: string; corps: string }

export interface ModeleEmail {
  cle: string
  famille: FamilleEmail
  nom: string
  /** Quand l'e-mail part. */
  quand: string
  /** Variables sans lesquelles l'e-mail ne sert à rien (lien, code…). */
  obligatoires?: string[]
  /** Variables qui peuvent être vides : leur paragraphe n'est alors pas affiché. */
  facultatives?: string[]
  /** Mot-clé noté dans l'historique des e-mails du couple. */
  etiquette?: string
  /** Rappel : lien « Ne plus recevoir ces rappels » ajouté en bas. */
  rappel?: boolean
  fr: ContenuEmail
  en: ContenuEmail
}

export const DESCRIPTION_VARIABLES: Record<string, string> = {
  prenom: 'prénom de la personne qui reçoit l’e-mail',
  partenaire: 'prénom de l’autre membre du couple',
  code: 'code (code couple, carte cadeau…)',
  lien: 'lien du bouton',
  lien_pacte: 'lien vers le pacte',
  module: 'titre du module',
  numero: 'numéro du module',
  total: 'nombre de modules du parcours',
  date: 'date concernée',
  quand: '« demain » ou « le 12 mars 2027 »',
  jours: '« 12 jours », « 1 jour »',
  rappel_rdv: 'phrase sur le prochain rendez-vous annuel (vide s’il n’y en a pas)',
  precision_rdv: '« , le 12 mars 2027 » (vide sans rendez-vous fixé)',
  phrase_abonnement: 'phrase sur le passage à l’abonnement annuel (vide si rien n’est programmé)',
  offre: 'ce qu’offre la carte cadeau (le pack initial…)',
  abonnement_rdv: 'phrase sur l’abonnement annuel nécessaire (vide si le couple est abonné)',
  mois: 'durée de la carte cadeau (ancienne variable)',
  mot_de_passe: 'nouveau mot de passe',
  annees: '« 1 an », « 5 ans »',
  matiere: 'matière des noces (coton, bois…)',
  autour_matiere: '« du coton », « de la laine »…',
  noces: '« noces de bois », « noces d’or »…',
  idees_cadeau: 'idées de cadeaux pour cette matière (vide s’il n’y en a pas)',
  invite_par: 'prénom de la personne qui invite (ou « Ton/ta partenaire »)',
  mot_personnel: 'mot personnel ajouté à la validation (Vue d’ensemble > Tâches), vide sinon',
}

export function variablesDuModele(m: Pick<ModeleEmail, 'fr' | 'en'>): string[] {
  return [...new Set([m.fr.objet, m.fr.corps, m.en.objet, m.en.corps].flatMap(variablesDuTexte))]
}

const BONJOUR = { fr: 'Bonjour {prenom},', en: 'Hello {prenom},' }
const EQUIPE = { fr: 'L’équipe YES BOX', en: 'The YES BOX team' }

// ---------------------------------------------------------------------------
// Inscription & compte
// ---------------------------------------------------------------------------

const INSCRIPTION: ModeleEmail[] = [
  {
    cle: 'confirmation_adresse', famille: 'inscription', nom: 'Confirmation de l’adresse e-mail',
    quand: 'À l’inscription, et quand la personne redemande le lien.',
    obligatoires: ['lien'],
    fr: { objet: 'Confirme ton adresse e-mail — YES BOX', corps: `${BONJOUR.fr}

Pour activer ton compte YES BOX — Le Pacte, confirme ton adresse e-mail en cliquant sur le bouton ci-dessous :

[bouton: Confirmer mon adresse | {lien}]

petit: Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur : {lien}

petit: Si tu n'es pas à l'origine de cette inscription, ignore simplement ce message.` },
    en: { objet: 'Confirm your email address — YES BOX', corps: `${BONJOUR.en}

To activate your YES BOX — Le Pacte account, confirm your email address by clicking the button below:

[bouton: Confirm my address | {lien}]

petit: If the button doesn't work, copy this link into your browser: {lien}

petit: If you didn't sign up, simply ignore this message.` },
  },
  {
    cle: 'bienvenue', famille: 'inscription', nom: 'Bienvenue (avec le code couple)',
    quand: 'Une fois l’adresse confirmée.',
    obligatoires: ['code'],
    fr: { objet: 'Bienvenue sur YES BOX — voici ton code couple', corps: `${BONJOUR.fr}

Ton compte YES BOX — Le Pacte est créé !

Voici ton code couple, à transmettre à la personne avec qui tu veux signer ton pacte :

[code: {code}]

Cette personne pourra le saisir lors de son inscription, ou depuis son espace.

À très vite,
${EQUIPE.fr}` },
    en: { objet: 'Welcome to YES BOX — here is your couple code', corps: `${BONJOUR.en}

Your YES BOX — Le Pacte account has been created!

Here is your couple code, to share with the person you want to sign your pact with:

[code: {code}]

They can enter it when signing up, or from their account.

See you soon,
${EQUIPE.en}` },
  },
  {
    cle: 'invitation_partenaire', famille: 'inscription', nom: 'Invitation du ou de la partenaire',
    quand: 'Quand un membre invite son ou sa partenaire par e-mail depuis le tableau de bord.',
    obligatoires: ['lien'],
    fr: { objet: '{invite_par} t’invite à écrire votre pacte de couple', corps: `Bonjour,

{invite_par} a commencé YES BOX et t’invite à le faire à deux.

YES BOX, ce sont des modules simples et ludiques pour parler de ce qui compte : chacun·e répond de son côté, puis vous découvrez vos réponses ensemble. Le module 1 est gratuit pour vous deux, sans carte bancaire.

[bouton: Rejoindre notre espace | {lien}]

Tu peux aussi créer ton compte sur le site et saisir le code de votre couple : **{code}**` },
    en: { objet: '{invite_par} invites you to write your couple’s pact', corps: `Hello,

{invite_par} has started YES BOX and is inviting you to do it together.

YES BOX is a set of simple, playful modules to talk about what matters: you each answer on your own, then discover your answers together. Module 1 is free for both of you, no card needed.

[bouton: Join our space | {lien}]

You can also create your account on the website and enter your couple code: **{code}**` },
  },
  {
    cle: 'mot_de_passe_oublie', famille: 'inscription', nom: 'Mot de passe oublié',
    quand: 'Quand la personne demande à changer son mot de passe.',
    obligatoires: ['lien'],
    fr: { objet: 'Choisis un nouveau mot de passe — YES BOX', corps: `${BONJOUR.fr}

Tu as demandé à changer ton mot de passe YES BOX. Clique sur le bouton ci-dessous pour en choisir un nouveau :

[bouton: Choisir un nouveau mot de passe | {lien}]

petit: Ce lien est valable 1 heure et ne sert qu'une fois. Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur : {lien}

petit: Si tu n'es pas à l'origine de cette demande, ignore ce message : ton mot de passe reste inchangé.` },
    en: { objet: 'Choose a new password — YES BOX', corps: `${BONJOUR.en}

You asked to change your YES BOX password. Click the button below to choose a new one:

[bouton: Choose a new password | {lien}]

petit: This link is valid for 1 hour and can only be used once. If the button doesn't work, copy this link into your browser: {lien}

petit: If you didn't request this, ignore this message: your password stays the same.` },
  },
  {
    cle: 'nouveau_mot_de_passe', famille: 'inscription', nom: 'Nouveau mot de passe (envoyé depuis l’admin)',
    quand: 'Quand l’admin réinitialise le mot de passe d’une personne.',
    obligatoires: ['mot_de_passe'],
    fr: { objet: 'Ton nouveau mot de passe YES BOX', corps: `${BONJOUR.fr}

Voici ton nouveau mot de passe pour te connecter à ton espace YES BOX — Le Pacte :

[code: {mot_de_passe}]

Connecte-toi puis change-le si tu le souhaites depuis ton espace.` },
    en: { objet: 'Your new YES BOX password', corps: `${BONJOUR.en}

Here is your new password to log in to your YES BOX — Le Pacte account:

[code: {mot_de_passe}]

Log in, then change it from your account if you wish.` },
  },
]

// ---------------------------------------------------------------------------
// Relances
// ---------------------------------------------------------------------------

const PAUSE = {
  fr: 'Votre parcours YES BOX est en pause depuis quelques jours.',
  en: 'Your YES BOX program has been on pause for a few days.',
}
const IDEE_DEBRIEF = {
  fr: 'Une idée : choisissez dès maintenant un moment dans la semaine pour découvrir vos réponses ensemble.',
  en: 'An idea: pick a moment this week right now to discover your answers together.',
}
const PAS_AVANCE = {
  fr: 'Cela fait quelques jours que votre parcours YES BOX n’a pas avancé. Rien de grave : la vie va vite. Mais c’est justement pour ça que ces moments à deux comptent.',
  en: 'Your YES BOX program hasn’t moved forward for a few days. No big deal: life moves fast. But that’s exactly why these moments together matter.',
}

const RELANCES: ModeleEmail[] = [
  {
    cle: 'relance_reponses_a_ton_tour', famille: 'relances', nom: 'Relance — l’autre attend tes réponses', rappel: true,
    quand: '10 jours sans avancer (puis 20 jours), quand un seul membre a répondu au module en cours. Envoyé à celui ou celle qui n’a pas répondu.',
    fr: { objet: '{partenaire} t’attend dans « {module} »', corps: `${BONJOUR.fr}

${PAUSE.fr} {partenaire} a terminé ses réponses au module « {module} » et attend les tiennes pour que vous puissiez les découvrir ensemble.

Pas besoin d’y passer des heures : un moment au calme suffit. Tes réponses restent cachées jusqu’à ce que vous ayez terminé de part et d’autre.

[bouton: Reprendre le module | {lien}]

${EQUIPE.fr}` },
    en: { objet: '{partenaire} is waiting for you in "{module}"', corps: `${BONJOUR.en}

${PAUSE.en} {partenaire} has finished their answers to the "{module}" module and is waiting for yours so you can discover them together.

No need to spend hours on it: a quiet moment is enough. Your answers stay hidden until you have both finished.

[bouton: Resume the module | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'relance_conclusion_a_ton_tour', famille: 'relances', nom: 'Relance — l’autre attend ta conclusion', rappel: true,
    quand: '10 jours sans avancer (puis 20 jours), quand un seul membre a écrit sa conclusion du module.',
    fr: { objet: '{partenaire} t’attend dans « {module} »', corps: `${BONJOUR.fr}

${PAUSE.fr} {partenaire} a écrit sa conclusion du module « {module} » et attend la tienne : le module suivant se débloquera dès que vos deux conclusions seront dans le journal.

Quelques lignes suffisent : ce que tu as appris, ce qui t’a surpris·e.

[bouton: Écrire ma conclusion | {lien}]

${EQUIPE.fr}` },
    en: { objet: '{partenaire} is waiting for you in "{module}"', corps: `${BONJOUR.en}

${PAUSE.en} {partenaire} has written their conclusion for the "{module}" module and is waiting for yours: the next module will unlock as soon as both your conclusions are in the journal.

A few lines are enough: what you learned, what surprised you.

[bouton: Write my conclusion | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'relance_pacte_a_signer', famille: 'relances', nom: 'Relance — l’autre attend ta signature du pacte', rappel: true,
    quand: '10 jours sans avancer (puis 20 jours), quand un seul membre a signé le pacte.',
    fr: { objet: '{partenaire} t’attend dans « {module} »', corps: `${BONJOUR.fr}

${PAUSE.fr} {partenaire} a signé votre pacte et attend ta signature pour clore le programme.

[bouton: Signer notre pacte | {lien}]

${EQUIPE.fr}` },
    en: { objet: '{partenaire} is waiting for you in "{module}"', corps: `${BONJOUR.en}

${PAUSE.en} {partenaire} has signed your pact and is waiting for your signature to complete the program.

[bouton: Sign our pact | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'relance_a_vous_deux', famille: 'relances', nom: 'Relance — module à commencer à deux', rappel: true,
    quand: '10 jours sans avancer (puis 20 jours), quand aucun des deux n’a fini de répondre au module en cours. Envoyé aux deux.',
    fr: { objet: 'Votre parcours vous attend : « {module} »', corps: `${BONJOUR.fr}

${PAS_AVANCE.fr}

Votre prochaine étape : le module **« {module} »** ({numero}/{total}).

Une idée : choisissez dès maintenant un créneau dans la semaine pour y répondre séparément, puis un autre pour découvrir vos réponses ensemble.

[bouton: Reprendre notre parcours | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your program is waiting for you: "{module}"', corps: `${BONJOUR.en}

${PAS_AVANCE.en}

Your next step: the **"{module}"** module ({numero}/{total}).

An idea: pick a slot this week right now to answer separately, then another one to discover your answers together.

[bouton: Resume our program | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'relance_debrief', famille: 'relances', nom: 'Relance — réponses à découvrir et conclusions à écrire', rappel: true,
    quand: '10 jours sans avancer (puis 20 jours), quand les deux ont répondu mais pas encore débriefé ni conclu. Envoyé aux deux.',
    fr: { objet: 'Votre parcours vous attend : « {module} »', corps: `${BONJOUR.fr}

${PAS_AVANCE.fr}

Votre prochaine étape : découvrir vos réponses et écrire vos conclusions du module **« {module} »** ({numero}/{total}).

${IDEE_DEBRIEF.fr}

[bouton: Reprendre notre parcours | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your program is waiting for you: "{module}"', corps: `${BONJOUR.en}

${PAS_AVANCE.en}

Your next step: discover your answers and write your conclusions for the **"{module}"** module ({numero}/{total}).

${IDEE_DEBRIEF.en}

[bouton: Resume our program | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'relance_debrief_pacte', famille: 'relances', nom: 'Relance — dernières réponses à découvrir et pacte à signer', rappel: true,
    quand: '10 jours sans avancer (puis 20 jours), au dernier module, quand il reste le débrief et la signature du pacte. Envoyé aux deux.',
    fr: { objet: 'Votre parcours vous attend : « {module} »', corps: `${BONJOUR.fr}

${PAS_AVANCE.fr}

Votre prochaine étape : découvrir vos réponses du module **« {module} »** ({numero}/{total}) et signer votre pacte.

${IDEE_DEBRIEF.fr}

[bouton: Reprendre notre parcours | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your program is waiting for you: "{module}"', corps: `${BONJOUR.en}

${PAS_AVANCE.en}

Your next step: discover your answers for the **"{module}"** module ({numero}/{total}) and sign your pact.

${IDEE_DEBRIEF.en}

[bouton: Resume our program | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'effacement_donnees', famille: 'relances', nom: 'Avertissement avant l’effacement des données',
    quand: 'Compte inactif depuis près de 24 mois : 2 mois, 1 mois, 1 semaine et la veille de l’effacement. Envoyé même si les rappels sont désactivés (obligation d’information).',
    fr: { objet: 'Vos données YES BOX seront effacées {quand}', corps: `${BONJOUR.fr}

Votre espace YES BOX n’a pas été utilisé depuis longtemps : nous effaçons les comptes après 24 mois d’inactivité. Sans connexion de votre part, vos comptes et vos données (réponses, conclusions et pacte) seront effacés {quand}.

Pour les garder, il vous suffit de vous connecter au site : le délai repart alors pour 24 mois. Vous pouvez aussi télécharger vos données complètes dans la rubrique Mon compte.

[bouton: Me connecter | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your YES BOX data will be deleted {quand}', corps: `${BONJOUR.en}

Your YES BOX space hasn’t been used for a long time: we delete accounts after 24 months of inactivity. Unless you log in, your accounts and your data (answers, conclusions and pact) will be deleted {quand}.

To keep them, simply log in to the website: the period then starts again for 24 months. You can also download all your data from the My Account section.

[bouton: Log in | {lien}]

${EQUIPE.en}` },
  },
]

// ---------------------------------------------------------------------------
// Fins de module & dévoilement des réponses
// ---------------------------------------------------------------------------

const MODULES: ModeleEmail[] = [
  {
    cle: 'module_reponses_a_ton_tour', famille: 'modules', nom: 'L’autre a fini de répondre — à ton tour',
    quand: 'Quand un membre a répondu à toutes les questions d’un module et pas l’autre. Envoyé à l’autre.',
    fr: { objet: '{partenaire} a terminé le module « {module} » — à ton tour !', corps: `${BONJOUR.fr}

{partenaire} vient de répondre à toutes les questions du module « {module} ».

À ton tour ! Ses réponses restent cachées tant que tu n'as pas répondu : vous les découvrirez ensemble.

[bouton: Répondre aux questions | {lien}]` },
    en: { objet: '{partenaire} finished the "{module}" module — your turn!', corps: `${BONJOUR.en}

{partenaire} just answered every question in the "{module}" module.

Your turn! Their answers stay hidden until you've answered: you'll discover them together.

[bouton: Answer the questions | {lien}]` },
  },
  {
    cle: 'module_reponses_partagees', famille: 'modules', nom: 'Réponses prêtes à être dévoilées',
    quand: 'Quand le second membre a fini de répondre. Envoyé à l’autre.',
    fr: { objet: 'Module « {module} » : vos réponses sont prêtes', corps: `${BONJOUR.fr}

{partenaire} vient de terminer à son tour le module « {module} ». Vous avez chacun·e répondu à toutes les questions.

C'est le moment de débriefer ensemble et de découvrir vos réponses respectives.

[bouton: Découvrir nos réponses | {lien}]` },
    en: { objet: '"{module}" module: your answers are ready', corps: `${BONJOUR.en}

{partenaire} just finished the "{module}" module too. You have both answered every question.

It's time to talk it over together and discover each other's answers.

[bouton: Discover our answers | {lien}]` },
  },
  {
    cle: 'module_conclusion_a_ton_tour', famille: 'modules', nom: 'L’autre a écrit sa conclusion — à ton tour',
    quand: 'Quand un membre a écrit sa conclusion du module et pas l’autre.',
    fr: { objet: '{partenaire} a écrit sa conclusion du module « {module} »', corps: `${BONJOUR.fr}

{partenaire} vient d'inscrire sa conclusion du module « {module} » dans votre journal.

À ton tour d'écrire la tienne : le module suivant se débloquera dès que vos deux conclusions seront dans le journal.

[bouton: Écrire ma conclusion | {lien}]` },
    en: { objet: '{partenaire} wrote their conclusion for the "{module}" module', corps: `${BONJOUR.en}

{partenaire} just added their conclusion for the "{module}" module to your journal.

Your turn to write yours: the next module will unlock as soon as both your conclusions are in the journal.

[bouton: Write my conclusion | {lien}]` },
  },
  {
    cle: 'module_scelle', famille: 'modules', nom: 'Module scellé — le suivant est débloqué',
    quand: 'Quand les deux conclusions du module sont écrites.',
    fr: { objet: 'Module « {module} » scellé — le suivant vous attend', corps: `${BONJOUR.fr}

{partenaire} vient d'écrire sa conclusion : vos deux conclusions du module « {module} » sont dans le journal.

Le module suivant est débloqué, vous pouvez passer à la suite.

[bouton: Passer au module suivant | {lien}]` },
    en: { objet: '"{module}" module sealed — the next one awaits', corps: `${BONJOUR.en}

{partenaire} just wrote their conclusion: both your conclusions for the "{module}" module are in the journal.

The next module is unlocked, you can move on.

[bouton: Go to the next module | {lien}]` },
  },
  {
    cle: 'module_scelle_dernier', famille: 'modules', nom: 'Dernier module scellé',
    quand: 'Quand les deux conclusions du dernier module sont écrites.',
    fr: { objet: 'Module « {module} » scellé', corps: `${BONJOUR.fr}

{partenaire} vient d'écrire sa conclusion : vos deux conclusions du module « {module} » sont dans le journal.

C'était le dernier module : bravo pour tout ce chemin parcouru ensemble !

[bouton: Voir notre tableau de bord | {lien}]` },
    en: { objet: '"{module}" module sealed', corps: `${BONJOUR.en}

{partenaire} just wrote their conclusion: both your conclusions for the "{module}" module are in the journal.

That was the last module: congratulations on everything you've been through together!

[bouton: See our dashboard | {lien}]` },
  },
  {
    cle: 'pacte_a_ton_tour', famille: 'modules', nom: 'L’autre a signé le pacte — à ton tour',
    quand: 'Quand un membre a signé le pacte et pas l’autre.',
    fr: { objet: '{partenaire} a signé votre pacte', corps: `${BONJOUR.fr}

{partenaire} vient de signer votre pacte de couple.

À ton tour de le signer : le programme sera terminé dès que vos deux signatures seront posées.

[bouton: Signer notre pacte | {lien}]` },
    en: { objet: '{partenaire} signed your pact', corps: `${BONJOUR.en}

{partenaire} just signed your couple's pact.

Your turn to sign it: the program will be complete as soon as you have both signed.

[bouton: Sign our pact | {lien}]` },
  },
  {
    cle: 'pacte_signe', famille: 'modules', nom: 'Pacte signé par les deux',
    quand: 'Quand la seconde signature du pacte est posée.',
    facultatives: ['phrase_abonnement'],
    fr: { objet: 'Votre pacte est signé', corps: `${BONJOUR.fr}

{partenaire} vient de signer à son tour : votre pacte de couple porte vos deux signatures.

Bravo pour tout ce chemin parcouru ensemble !

{phrase_abonnement}

Vous recevrez des messages régulièrement tout au long de l'année (2 par mois maximum) pour continuer à renforcer votre couple, jusqu'à la date de rendez-vous que vous avez fixée.

Ce jour-là, un module spécial vous attendra, et nous vous guiderons en amont pour préparer ce rendez-vous comme il se doit. Retrouvez la date de votre rendez-vous annuel sur votre tableau de bord.

À bientôt, et prenez soin de vous et de votre couple.

[bouton: Voir notre tableau de bord | {lien}]` },
    en: { objet: 'Your pact is signed', corps: `${BONJOUR.en}

{partenaire} just signed too: your couple's pact now bears both your signatures.

Congratulations on everything you've been through together!

{phrase_abonnement}

You'll receive messages regularly throughout the year (2 per month at most) to keep strengthening your relationship, until the date you set for your yearly date.

On that day, a special module will be waiting for you, and we'll guide you beforehand so you can prepare for it properly. You'll find the date of your yearly date on your dashboard.

See you soon, and take care of yourselves and your relationship.

[bouton: See our dashboard | {lien}]` },
  },
]

// ---------------------------------------------------------------------------
// Rendez-vous mensuels & bilan annuel
// ---------------------------------------------------------------------------

// Un thème par mois après la signature du pacte (cf. rappels-email.ts).
const THEMES: { fr: ContenuEmail; en: ContenuEmail; question: [string, string] }[] = [
  {
    fr: { objet: 'Un mois que vous avez signé votre pacte 💍', corps: `Il y a un mois, {partenaire} et toi avez signé votre pacte. Bravo : beaucoup de couples n’osent jamais mettre des mots sur ce qui compte vraiment à deux.

Le pacte vit surtout dans les petits gestes du quotidien. Ce mois-ci, une seule question à vous poser à deux :

**« Quel engagement de notre pacte avons-nous le mieux tenu ce mois-ci ? »**` },
    en: { objet: 'One month since you signed your pact 💍', corps: `A month ago, {partenaire} and you signed your pact. Well done: many couples never dare to put into words what truly matters to them as a pair.

Your pact lives mostly in small everyday gestures. This month, just one question to ask each other:

**"Which commitment in our pact did we keep best this month?"**` },
    question: ['Quel engagement de notre pacte avons-nous le mieux tenu ce mois-ci ?', 'Which commitment in our pact did we keep best this month?'],
  },
  {
    fr: { objet: 'Et si vous vous disiez merci ?', corps: `Dans votre pacte, vous avez parlé de gratitude. Ce mois-ci, petit défi : dis à {partenaire} une chose précise que tu as appréciée cette semaine. Pas un « merci pour tout », un vrai détail.

Ça prend 30 secondes, et c’est souvent ce qu’on oublie le plus vite.` },
    en: { objet: 'What if you said thank you?', corps: `In your pact, you talked about gratitude. This month, a little challenge: tell {partenaire} one specific thing you appreciated this week. Not a "thanks for everything", a real detail.

It takes 30 seconds, and it’s often what we forget first.` },
    question: ['Quelle chose précise ai-je appréciée chez l’autre ce mois-ci ?', 'What specific thing did I appreciate about the other this month?'],
  },
  {
    fr: { objet: 'Votre socle tient-il bon ?', corps: `Au moment d’écrire votre pacte, vous avez choisi les 3 principes de base d’un couple heureux… et du vôtre en particulier.

Ce mois-ci, relisez-les ensemble : **lequel avez-vous le plus vécu ces dernières semaines ? Lequel aimeriez-vous soigner davantage ?**` },
    en: { objet: 'Is your foundation holding strong?', corps: `When writing your pact, you chose the 3 core principles of a happy couple… and of yours in particular.

This month, reread them together: **which one have you lived the most these past weeks? Which one would you like to nurture more?**` },
    question: ['Lequel de nos 3 principes avons-nous le plus vécu ? Lequel aimerions-nous soigner davantage ?', 'Which of our 3 principles did we live most? Which one would we like to nurture more?'],
  },
  {
    fr: { objet: 'Un moment rien qu’à vous', corps: `Le quotidien a vite fait de reprendre toute la place. Ce mois-ci, un défi simple : **bloquez une soirée sans écran, rien que tous les deux**.

Pas besoin d’un grand programme : un repas, une balade, une conversation sans téléphone à portée de main.` },
    en: { objet: 'A moment just for the two of you', corps: `Everyday life easily takes up all the space. This month, a simple challenge: **set aside a screen-free evening, just the two of you**.

No need for big plans: a meal, a walk, a conversation with no phone within reach.` },
    question: ['Notre soirée sans écran : qu’avons-nous fait, et qu’en retenons-nous ?', 'Our screen-free evening: what did we do, and what do we take from it?'],
  },
  {
    fr: { objet: 'Le désaccord du mois', corps: `En écrivant votre pacte, vous avez classé vos désaccords : négociable, pas encore réfléchi, rédhibitoire.

Ce mois-ci, choisissez **un désaccord « négociable »** et prenez un moment calme pour en reparler. L’objectif n’est pas de gagner, mais de comprendre ce qui compte pour l’autre.` },
    en: { objet: 'The disagreement of the month', corps: `When writing your pact, you sorted your disagreements: negotiable, not yet thought through, dealbreaker.

This month, pick **one "negotiable" disagreement** and take a calm moment to talk about it again. The goal isn’t to win, but to understand what matters to the other person.` },
    question: ['Quel désaccord « négociable » avons-nous repris, et qu’avons-nous compris de l’autre ?', 'Which "negotiable" disagreement did we revisit, and what did we understand about each other?'],
  },
  {
    fr: { objet: 'Mi-parcours de votre année', corps: `Votre pacte a déjà plusieurs mois. C’est le bon moment pour le relire ensemble.

**Y a-t-il un engagement à ajuster, à préciser, ou un nouveau à ajouter ?** Un pacte vivant, c’est un pacte qui évolue avec vous.` },
    en: { objet: 'Halfway through your year', corps: `Your pact is already a few months old. It’s the right time to reread it together.

**Is there a commitment to adjust, clarify, or a new one to add?** A living pact is one that grows with you.` },
    question: ['Y a-t-il un engagement de notre pacte à ajuster, à préciser ou à ajouter ?', 'Is there a commitment in our pact to adjust, clarify or add?'],
  },
  {
    fr: { objet: 'Le geste qui vous rapproche', corps: `Vous vous êtes choisi un geste ou un code de rapprochement. Ce mois-ci, faites-le vivre : **utilisez-le au moins une fois par semaine**.

Ce sont ces petits signes qui entretiennent la complicité au quotidien.` },
    en: { objet: 'The gesture that brings you closer', corps: `You chose a gesture or code to reconnect. This month, bring it to life: **use it at least once a week**.

These small signs are what keep your bond alive day to day.` },
    question: ['Comment avons-nous fait vivre notre geste de rapprochement ?', 'How did we keep our closeness gesture alive?'],
  },
  {
    fr: { objet: 'Qu’est-ce qui a changé entre vous ?', corps: `Depuis le début de votre parcours, des choses ont bougé, même discrètement.

Ce mois-ci, prenez un moment pour vous le dire : **qu’est-ce qui va mieux entre vous ? Qu’est-ce que vous voulez garder précieusement ?**` },
    en: { objet: 'What has changed between you?', corps: `Since you started your program, things have shifted, even quietly.

This month, take a moment to tell each other: **what is going better between you? What do you want to hold on to?**` },
    question: ['Qu’est-ce qui va mieux entre nous ? Que voulons-nous garder précieusement ?', 'What is going better between us? What do we want to treasure?'],
  },
  {
    fr: { objet: 'Vos rêves à deux', corps: `Un voyage, un projet, une envie dont vous parlez depuis longtemps ?

Ce mois-ci, choisissez **un projet commun et faites-le avancer d’un pas** : une date, une réservation, un premier rendez-vous.` },
    en: { objet: 'Your shared dreams', corps: `A trip, a project, something you’ve been talking about for a long time?

This month, choose **one shared project and move it forward by one step**: a date, a booking, a first appointment.` },
    question: ['Quel projet commun avons-nous fait avancer, et de quel pas ?', 'Which shared project did we move forward, and by what step?'],
  },
  {
    fr: { objet: 'Prendre soin de soi pour prendre soin du couple', corps: `Un couple solide, c’est aussi deux personnes qui vont bien.

Ce mois-ci, posez-vous la question séparément, puis partagez vos réponses : **de quoi ai-je besoin en ce moment ? Qu’est-ce que l’autre pourrait faire pour m’aider ?**` },
    en: { objet: 'Taking care of yourself to take care of your couple', corps: `A strong couple is also two people who are doing well.

This month, ask yourselves separately, then share your answers: **what do I need right now? What could the other person do to help me?**` },
    question: ['De quoi ai-je besoin en ce moment ? Qu’est-ce que l’autre pourrait faire pour m’aider ?', 'What do I need right now? What could the other do to help me?'],
  },
  {
    fr: { objet: 'La gratitude, encore', corps: `Ce mois-ci, un petit geste : écris un mot à {partenaire}. Quelques lignes sur un papier, un message, peu importe.

Dis-lui ce que tu apprécies le plus en ce moment dans votre relation. C’est simple, et ça marque longtemps.` },
    en: { objet: 'Gratitude, once more', corps: `This month, a small gesture: write a note to {partenaire}. A few lines on paper, a message, it doesn’t matter.

Tell them what you appreciate most in your relationship right now. It’s simple, and it stays with you for a long time.` },
    question: ['Qu’ai-je écrit à l’autre, et qu’est-ce que ce mot a changé ?', 'What did I write to the other, and what did that note change?'],
  },
]

export const NOMBRE_THEMES_MENSUELS = THEMES.length

// Titre (objet par défaut) et question de chaque thème, pour la page « Nos
// rendez-vous annuels ».
export function themeMensuelParDefaut(index: number) {
  const theme = THEMES[index]
  return { objet: { fr: theme.fr.objet, en: theme.en.objet }, question: { fr: theme.question[0], en: theme.question[1] } }
}

export function cleThemeMensuel(index: number) {
  return `mensuel_${index + 1}`
}

const MENSUELS: ModeleEmail[] = [
  ...THEMES.map((theme, i): ModeleEmail => ({
    cle: cleThemeMensuel(i), famille: 'mensuels', nom: `Mois ${i + 1} — ${theme.fr.objet}`, rappel: true,
    quand: i === 0
      ? '1 mois après la signature du pacte.'
      : `${i + 1} mois après la signature du pacte (puis en boucle, à partir du mois 2, après le rendez-vous annuel).`,
    facultatives: ['rappel_rdv'],
    fr: { objet: theme.fr.objet, corps: `${BONJOUR.fr}

${theme.fr.corps}

Notez vos réponses dans « Nos rendez-vous annuels » : vous les retrouverez pour votre bilan annuel.

[bouton: Noter nos réponses | {lien}]

[lien: Relire notre pacte | {lien_pacte}]

petit: {rappel_rdv}

${EQUIPE.fr}` },
    en: { objet: theme.en.objet, corps: `${BONJOUR.en}

${theme.en.corps}

Note your answers in "Our yearly dates": you’ll find them again for your yearly review.

[bouton: Note our answers | {lien}]

[lien: Reread our pact | {lien_pacte}]

petit: {rappel_rdv}

${EQUIPE.en}` },
  })),
  {
    cle: 'rdv_annuel_approche', famille: 'mensuels', nom: 'Le rendez-vous annuel approche', rappel: true,
    quand: 'À la place de l’e-mail du mois quand le rendez-vous annuel (bilan) tombe dans le mois qui suit. Sans abonnement annuel, rappelle qu’il faut le prendre pour ouvrir le module.',
    facultatives: ['abonnement_rdv'],
    fr: { objet: 'Votre rendez-vous annuel approche : le {date}', corps: `${BONJOUR.fr}

Dans {jours}, c’est votre rendez-vous annuel. Le module « Notre rendez-vous annuel » s’ouvrira le {date} : vous y regarderez ensemble votre année, ce qui a marché, ce qui a été dur, ce que vous voulez pour la suite.

{abonnement_rdv}

Vous aviez choisi ensemble qui l’organise : c’est peut-être le moment de réserver le lieu ou de bloquer la soirée !

[bouton: Voir notre pacte | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your yearly date is coming up: {date}', corps: `${BONJOUR.en}

In {jours}, it’s your yearly date. The "Our Yearly Date" module will open on {date}: you’ll look back on your year together, what worked, what was hard, and what you want next.

{abonnement_rdv}

You chose together who would organize it: maybe it’s time to book the place or block the evening!

[bouton: See our pact | {lien}]

${EQUIPE.en}` },
  },
]

// ---------------------------------------------------------------------------
// Anniversaires
// ---------------------------------------------------------------------------

// Anniversaire de couple : un conseil différent chaque année (on reprend
// au début après le dernier).
const CONSEILS_RENCONTRE: { etiquette: string; fr: string; en: string }[] = [
  {
    etiquette: 'photo d’époque',
    fr: '**Le défi du jour : retrouvez une photo de l’époque.** Cherchez chacun·e de votre côté une photo de vos débuts, puis montrez-la à l’autre ce soir. Racontez-vous ce qui se passait ce jour-là, et ce qui vous a donné envie de continuer ensemble.',
    en: '**Today’s challenge: find a photo from back then.** Each of you looks for a photo from your early days, then show it to each other tonight. Tell each other what was happening that day, and what made you want to keep going together.',
  },
  {
    etiquette: 'mot doux caché',
    fr: '**Le défi du jour : un mot doux caché.** Écrivez un petit mot à l’autre et cachez-le là où il ou elle le trouvera dans la journée : dans une poche, un livre, sur le miroir…',
    en: '**Today’s challenge: a hidden love note.** Write a little note to each other and hide it where the other will find it during the day: in a pocket, a book, on the mirror…',
  },
  {
    etiquette: 'compliment',
    fr: '**Le défi du jour : un compliment sincère.** Dites-vous ce soir un compliment précis, que vous ne vous êtes encore jamais dit. Pas un « tu es super » : un vrai détail qui vous touche chez l’autre.',
    en: '**Today’s challenge: a sincere compliment.** Tonight, give each other a specific compliment you’ve never said before. Not a "you’re great": a real detail you love about the other.',
  },
  {
    etiquette: 'balade à deux',
    fr: '**Le défi du jour : une balade à deux.** Prenez un moment pour aller vous promener ensemble, sans téléphone. Marchez, parlez, ou profitez simplement d’être côte à côte.',
    en: '**Today’s challenge: a walk together.** Take a moment to go for a walk together, without your phones. Walk, talk, or simply enjoy being side by side.',
  },
  {
    etiquette: 'bocal à souvenirs',
    fr: '**Le défi du jour : un bocal à souvenirs.** Prenez un bocal ou une jolie boîte, et glissez-y chacun·e cinq petits papiers avec un souvenir heureux de l’année qui vient de s’écouler. Lisez-les ensemble ce soir, puis gardez le bocal : il se remplira d’année en année.',
    en: '**Today’s challenge: a memory jar.** Take a jar or a pretty box, and each slip in five little notes with a happy memory from the past year. Read them together tonight, then keep the jar: it will fill up year after year.',
  },
  {
    etiquette: 'photo de l’année',
    fr: '**Le défi du jour : la photo de l’année.** Prenez-vous en photo tous les deux aujourd’hui, au même endroit ou dans la même pose chaque année. Dans quelques années, vous aurez votre propre album d’anniversaires.',
    en: '**Today’s challenge: this year’s photo.** Take a photo of the two of you today, in the same place or the same pose every year. In a few years, you’ll have your very own anniversary album.',
  },
  {
    etiquette: 'playlist',
    fr: '**Le défi du jour : la playlist de votre histoire.** Choisissez une chanson pour chaque année passée ensemble, et écoutez-la ce soir en vous racontant ce qu’elle vous rappelle.',
    en: '**Today’s challenge: the playlist of your story.** Pick one song for each year you’ve spent together, and listen to it tonight while sharing what it reminds you of.',
  },
  {
    etiquette: 'plat souvenir',
    fr: '**Le défi du jour : un plat souvenir.** Cuisinez ensemble le plat d’un moment qui compte pour vous deux : un voyage, un premier repas, une recette de famille.',
    en: '**Today’s challenge: a dish full of memories.** Cook together the dish of a moment that matters to you both: a trip, a first meal, a family recipe.',
  },
]

export const NOMBRE_CONSEILS_RENCONTRE = CONSEILS_RENCONTRE.length

// Modèle de l'année : 1re année → conseil 1, …, puis on reprend au début.
export function cleAnniversaireRencontre(annees: number) {
  return `anniv_rencontre_${((Math.max(annees, 1) - 1) % CONSEILS_RENCONTRE.length) + 1}`
}

const ANNIVERSAIRES: ModeleEmail[] = [
  ...CONSEILS_RENCONTRE.map((conseil, i): ModeleEmail => ({
    cle: `anniv_rencontre_${i + 1}`, famille: 'anniversaires', nom: `Anniversaire de couple — année ${i + 1} : ${conseil.etiquette}`, rappel: true,
    etiquette: conseil.etiquette,
    facultatives: ['mot_personnel'],
    quand: `Le jour J de l’anniversaire de couple, une fois validé dans Vue d’ensemble > Tâches, la ${i + 1}${i ? 'e' : 're'} année (puis tous les ${CONSEILS_RENCONTRE.length} ans : année ${i + 1 + CONSEILS_RENCONTRE.length}, ${i + 1 + 2 * CONSEILS_RENCONTRE.length}…).`,
    fr: { objet: 'Joyeux anniversaire de couple ! {annees} aujourd’hui 💞', corps: `${BONJOUR.fr}

Il y a {annees}, jour pour jour, votre histoire commençait. Toute l’équipe YES BOX vous souhaite un très bel anniversaire de couple !

${conseil.fr}

{mot_personnel}

Belle journée à vous deux,
${EQUIPE.fr}` },
    en: { objet: 'Happy couple anniversary! {annees} today 💞', corps: `${BONJOUR.en}

{annees} ago to the day, your story began. The whole YES BOX team wishes you a very happy couple anniversary!

${conseil.en}

{mot_personnel}

Have a lovely day, both of you,
${EQUIPE.en}` },
  })),
  {
    cle: 'anniv_mariage', famille: 'anniversaires', nom: 'Anniversaire de mariage — une semaine avant (avec les noces)', rappel: true,
    quand: 'Une semaine avant l’anniversaire de mariage, une fois validé dans Vue d’ensemble > Tâches, quand l’année a un nom de noces (coton, bois…).',
    facultatives: ['idees_cadeau', 'mot_personnel'],
    fr: { objet: 'Dans une semaine : vos {noces}', corps: `${BONJOUR.fr}

Dans une semaine, le {date}, vous fêterez {annees} de mariage : vos **{noces}**.

**Qu’avez-vous prévu pour votre anniversaire de mariage ?** Un dîner, une escapade, un moment rien qu’à vous deux ?

Pourquoi ne pas vous offrir un petit cadeau symbolique autour {autour_matiere} ? Par exemple : {idees_cadeau}.

{mot_personnel}

Belle préparation à vous deux,
${EQUIPE.fr}` },
    en: { objet: 'One week to go: your {matiere} anniversary', corps: `${BONJOUR.en}

In a week, on {date}, you’ll celebrate {annees} of marriage: your **{matiere} anniversary**.

**What have you planned for your wedding anniversary?** A dinner, a getaway, a moment just for the two of you?

Why not treat yourselves to a small symbolic gift around {matiere}? For example: {idees_cadeau}.

{mot_personnel}

Enjoy getting ready, both of you,
${EQUIPE.en}` },
  },
  {
    cle: 'anniv_mariage_sans_noces', famille: 'anniversaires', nom: 'Anniversaire de mariage — une semaine avant (année sans nom de noces)', rappel: true,
    facultatives: ['mot_personnel'],
    quand: 'Une semaine avant l’anniversaire de mariage, une fois validé dans Vue d’ensemble > Tâches, les années sans nom de noces (51 à 54 ans…).',
    fr: { objet: 'Dans une semaine : {annees} de mariage', corps: `${BONJOUR.fr}

Dans une semaine, le {date}, vous fêterez {annees} de mariage.

**Qu’avez-vous prévu pour votre anniversaire de mariage ?** Un dîner, une escapade, un moment rien qu’à vous deux ?

{mot_personnel}

Belle préparation à vous deux,
${EQUIPE.fr}` },
    en: { objet: 'One week to go: {annees} of marriage', corps: `${BONJOUR.en}

In a week, on {date}, you’ll celebrate {annees} of marriage.

**What have you planned for your wedding anniversary?** A dinner, a getaway, a moment just for the two of you?

{mot_personnel}

Enjoy getting ready, both of you,
${EQUIPE.en}` },
  },
]

// ---------------------------------------------------------------------------
// Abonnement & cartes cadeaux
// ---------------------------------------------------------------------------

const ABONNEMENT: ModeleEmail[] = [
  {
    cle: 'bascule_annuelle_proposition', famille: 'abonnement', nom: 'Proposition de l’abonnement annuel', rappel: true,
    quand: 'Pacte signé, 5 jours avant la fin du mois payé, si le passage à l’annuel n’est pas encore programmé.',
    fr: { objet: 'Continuez l’aventure avec l’abonnement annuel', corps: `${BONJOUR.fr}

Votre parcours initial est terminé, bravo ! Votre mois d’abonnement en cours se termine le {date}.

Pour continuer à faire vivre votre pacte, passez à l’abonnement annuel « Pacte – notre rendez-vous annuel » : **19 € par an**. Vous recevrez régulièrement de petits messages pour continuer à renforcer votre couple, et le module « Notre rendez-vous annuel » s’ouvrira à la date que vous avez fixée{precision_rdv}.

Rien ne change d’ici là : la bascule a lieu le {date}, et les 19 € sont prélevés ce jour-là sur la carte déjà enregistrée. Résiliable à tout moment depuis Mon compte.

[bouton: Passer à l’abonnement annuel | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Keep going with the yearly subscription', corps: `${BONJOUR.en}

You've completed the initial program, well done! Your current month of subscription ends on {date}.

To keep your pact alive, switch to the "Pact – our yearly date" yearly subscription: **€19 per year**. You'll receive little messages regularly to keep strengthening your relationship, and the "Our Yearly Date" module will open on the date you set{precision_rdv}.

Nothing changes until then: the switch happens on {date}, and the €19 is charged that day to the card already on file. Cancel anytime from My Account.

[bouton: Switch to the yearly subscription | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'bascule_annuelle_programmee', famille: 'abonnement', nom: 'Abonnement annuel programmé — rappel avant le prélèvement', rappel: true,
    quand: 'Pacte signé, 5 jours avant la fin du mois payé, quand le passage à l’annuel est déjà programmé.',
    fr: { objet: 'Votre abonnement annuel commence bientôt', corps: `${BONJOUR.fr}

Votre mois d’abonnement en cours se termine le {date}. Ce jour-là, vous passerez automatiquement à l’abonnement annuel « Pacte – notre rendez-vous annuel » : **19 € par an**, prélevés sur la carte déjà enregistrée. Vous n’avez rien à faire.

Vous continuerez à recevoir de petits messages pour renforcer votre couple, et le module « Notre rendez-vous annuel » s’ouvrira à la date que vous avez fixée{precision_rdv}.

Si vous préférez ne pas continuer, vous pouvez annuler ce passage ou résilier à tout moment depuis Mon compte.

[bouton: Mon compte | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your yearly subscription starts soon', corps: `${BONJOUR.en}

Your current month of subscription ends on {date}. That day, you'll automatically switch to the "Pact – our yearly date" yearly subscription: **€19 per year**, charged to the card already on file. There's nothing for you to do.

You'll keep receiving little messages to strengthen your relationship, and the "Our Yearly Date" module will open on the date you set{precision_rdv}.

If you'd rather not continue, you can cancel this switch or your subscription anytime from My Account.

[bouton: My Account | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'renouvellement_annuel_annonce', famille: 'abonnement', nom: 'Annonce du renouvellement de l’abonnement annuel (19 €)',
    quand: 'Un mois avant chaque renouvellement de l’abonnement « Pacte – notre rendez-vous annuel », si le renouvellement automatique n’est pas arrêté. Envoyé même si les rappels sont désactivés (information avant renouvellement).',
    obligatoires: ['date'],
    fr: { objet: 'Votre abonnement annuel se renouvelle le {date}', corps: `${BONJOUR.fr}

Petit message pour vous prévenir : le {date}, votre abonnement « Pacte – notre rendez-vous annuel » se renouvelle automatiquement pour un an. **19 €** seront prélevés ce jour-là sur la carte déjà enregistrée. Vous n’avez rien à faire.

Cette nouvelle année vous donne accès au module « Notre rendez-vous annuel » à la date que vous avez choisie, et à tous les modules si vous souhaitez les refaire.

Si vous préférez ne pas continuer, vous pouvez arrêter le renouvellement en un clic depuis Mon compte, avant le {date}.

[bouton: Mon compte | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your yearly subscription renews on {date}', corps: `${BONJOUR.en}

Just a quick note to let you know: on {date}, your "Pact – our yearly date" subscription renews automatically for one year. **€19** will be charged that day to the card already on file. There's nothing for you to do.

This new year gives you access to the "Our Yearly Date" module on the date you chose, and to every module if you want to go through them again.

If you'd rather not continue, you can stop the renewal in one click from My Account, before {date}.

[bouton: My Account | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'rdv_annuel_abonnement', famille: 'abonnement', nom: 'Rendez-vous annuel dans 2 mois — proposition de l’abonnement', rappel: true,
    quand: 'Deux mois avant la date du rendez-vous annuel choisie par le couple, pacte signé, sans abonnement annuel en cours.',
    obligatoires: ['date'],
    fr: { objet: 'Votre rendez-vous annuel, le {date} : on continue ?', corps: `${BONJOUR.fr}

Dans deux mois, le {date}, c’est votre rendez-vous annuel : le moment de relire votre pacte à deux, de regarder votre année et de le faire évoluer.

Pour ouvrir le module « Notre rendez-vous annuel » ce jour-là, il vous faut l’abonnement « Pacte – notre rendez-vous annuel » : **19 € par an**, résiliable à tout moment depuis Mon compte. Il vous donne aussi accès à tous les modules si vous souhaitez les refaire.

Sans abonnement, votre pacte et tout ce que vous avez déjà réalisé restent consultables, et vous continuez à recevoir nos petits messages.

[bouton: Prendre l’abonnement annuel | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your yearly date on {date}: shall we keep going?', corps: `${BONJOUR.en}

In two months, on {date}, it's your yearly date: the moment to reread your pact together, look back on your year and make it grow.

To open the "Our Yearly Date" module that day, you need the "Pact – our yearly date" subscription: **€19 per year**, cancel anytime from My Account. It also gives you access to every module if you want to go through them again.

Without a subscription, your pact and everything you've already completed stay viewable, and you keep receiving our little messages.

[bouton: Get the yearly subscription | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'fin_pack_initial', famille: 'abonnement', nom: 'Fin de l’année du pack initial — continuer à 19 €/an', rappel: true,
    quand: 'Un mois avant la fin de l’année du pack initial (acheté ou offert), si le pacte n’est pas encore signé et sans abonnement en cours.',
    obligatoires: ['date'],
    fr: { objet: 'Votre pack initial se termine le {date}', corps: `${BONJOUR.fr}

L’année prévue pour réaliser votre pack initial YES BOX – Le Pacte se termine le {date}, et votre pacte n’est pas encore signé.

Pour prendre le temps de terminer votre parcours, passez à l’abonnement « Pacte – notre rendez-vous annuel » : **19 € par an**, résiliable à tout moment depuis Mon compte. Il vous donne accès à tous les modules, puis au module « Notre rendez-vous annuel » à la date que vous choisirez.

Sans abonnement, les parties déjà réalisées restent consultables.

[bouton: Continuer pour 19 €/an | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your starter pack ends on {date}', corps: `${BONJOUR.en}

The year set aside to complete your YES BOX – Le Pacte starter pack ends on {date}, and your pact isn't signed yet.

To take the time to finish your program, switch to the "Pact – our yearly date" subscription: **€19 per year**, cancel anytime from My Account. It gives you access to every module, then to the "Our Yearly Date" module on the date you choose.

Without a subscription, the parts you've already completed stay viewable.

[bouton: Continue for €19/year | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'carte_cadeau_offerte', famille: 'abonnement', nom: 'Carte cadeau achetée pour l’offrir',
    quand: 'Après l’achat d’une carte cadeau destinée à un autre couple. Envoyé à la personne qui achète.',
    obligatoires: ['code'],
    fr: { objet: 'Votre carte cadeau YES BOX : {code}', corps: `Bonjour,

Merci pour votre achat ! Voici votre carte cadeau YES BOX : **{offre}**, au programme YES BOX – Le Pacte.

[code: {code}]

Transmettez ce code au couple à qui vous l’offrez : il suffit de le saisir lors de l’inscription sur yesbox-lepacte.fr, ou plus tard dans Mon compte, rubrique « Ajouter un code ». Vous pouvez aussi imprimer la carte cadeau ci-dessous.

Valable jusqu’au {date}, pour un seul couple.

[bouton: Télécharger la carte à imprimer | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your YES BOX gift card: {code}', corps: `Hello,

Thank you for your purchase! Here is your YES BOX gift card: **{offre}**, from the YES BOX – Le Pacte program.

[code: {code}]

Pass this code on to the couple you are giving it to: they just enter it when signing up at yesbox-lepacte.fr, or later in My Account, under "Add a code". You can also print the gift card below.

Valid until {date}, for one couple.

[bouton: Download the printable card | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'carte_cadeau_pour_soi', famille: 'abonnement', nom: 'Carte cadeau achetée pour soi',
    quand: 'Après l’achat d’une carte cadeau pour son propre couple.',
    obligatoires: ['code'],
    fr: { objet: 'Votre carte cadeau YES BOX : {code}', corps: `Bonjour,

Merci pour votre achat ! Voici votre carte cadeau YES BOX : **{offre}**, au programme YES BOX – Le Pacte.

[code: {code}]

Pour l’activer, connectez-vous sur yesbox-lepacte.fr et saisissez ce code dans Mon compte, rubrique « Ajouter un code » (ou lors de votre inscription).

Valable jusqu’au {date}, pour un seul couple.

[bouton: Télécharger la carte à imprimer | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Your YES BOX gift card: {code}', corps: `Hello,

Thank you for your purchase! Here is your YES BOX gift card: **{offre}**, from the YES BOX – Le Pacte program.

[code: {code}]

To activate it, log in at yesbox-lepacte.fr and enter this code in My Account, under "Add a code" (or when you sign up).

Valid until {date}, for one couple.

[bouton: Download the printable card | {lien}]

${EQUIPE.en}` },
  },
]

export const MODELES_EMAIL: ModeleEmail[] = [...INSCRIPTION, ...RELANCES, ...MODULES, ...MENSUELS, ...ANNIVERSAIRES, ...ABONNEMENT]

const PAR_CLE = new Map(MODELES_EMAIL.map(m => [m.cle, m]))

export function modeleEmail(cle: string): ModeleEmail {
  const m = PAR_CLE.get(cle)
  if (!m) throw new Error(`Modèle d'e-mail inconnu : ${cle}`)
  return m
}

export function estModeleEmail(cle: string) {
  return PAR_CLE.has(cle)
}
