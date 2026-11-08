import { variablesDuTexte } from './rendu'

// Catalogue de tous les e-mails automatiques envoyés aux couples, classés
// par famille. Chaque modèle a une version française et anglaise ; l'admin
// peut les modifier (Admin > Messages & e-mails, réglages
// « modele_email::<clé>::<langue> »), sinon c'est le texte ci-dessous qui
// part. Format du texte : voir ./rendu.ts.

export type FamilleEmail = 'inscription' | 'relances' | 'modules' | 'mensuels' | 'anniversaires' | 'abonnement'

export const FAMILLES: { cle: FamilleEmail; nom: string; description: string }[] = [
  { cle: 'inscription', nom: 'Inscription & compte', description: 'Confirmation d’adresse, bienvenue, invitation du ou de la partenaire, mot de passe.' },
  { cle: 'relances', nom: 'Relances (inactivité, effacement des données)', description: 'Couple pas encore au complet, couple au complet qui n’a pas commencé, parcours en pause depuis 10 jours, avertissement avant l’effacement d’un compte inactif.' },
  { cle: 'modules', nom: 'Fins de module & dévoilement des réponses', description: 'Envoyés à l’autre membre du couple à chaque étape d’un module et du pacte.' },
  { cle: 'mensuels', nom: 'Rendez-vous mensuels, fêtes & bilan annuel', description: 'Un e-mail par mois une fois le pacte signé (chaque thème une seule fois, sans boucle), fêtes de fin d’année, Saint-Valentin, et l’annonce du rendez-vous annuel.' },
  { cle: 'anniversaires', nom: 'Anniversaires', description: 'Anniversaire de couple (le jour J, un conseil différent chaque année) et de mariage (une semaine avant). Chaque envoi est validé dans Vue d’ensemble > Tâches.' },
  { cle: 'abonnement', nom: 'Abonnement, cartes cadeaux & avis', description: 'Renouvellement à 19 €/an, passage à l’abonnement annuel, cartes cadeaux, code de réduction offert pour un avis publié.' },
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
  lien_avis: 'lien vers la page pour laisser un avis',
  module: 'titre du module',
  numero: 'numéro du module',
  total: 'nombre de modules du parcours',
  date: 'date concernée',
  quand: '« demain » ou « le 12 mars 2027 »',
  jours: '« 12 jours », « 1 jour »',
  lien_intimite: 'lien vers le module « Tendresse et intimité »',
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
  invite_par: 'prénom de la personne qui invite (ou « Votre partenaire »)',
  code_parrainage: 'code de parrainage du couple',
  avancement: '« le module « Moi » » ou « 6 modules, le dernier étant « Nos projets » »',
  site: 'adresse du site, pour les visuels du dossier public/emails',
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
    fr: { objet: 'Confirmez votre adresse e-mail — YES BOX', corps: `${BONJOUR.fr}

Pour confirmer que cette adresse est bien la vôtre et recevoir votre code couple, cliquez sur le bouton ci-dessous :

[bouton: Confirmer mon adresse | {lien}]

petit: Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : {lien}

petit: Si vous n’êtes pas à l’origine de cette inscription, ignorez simplement ce message.` },
    en: { objet: 'Confirm your email address — YES BOX', corps: `${BONJOUR.en}

To confirm this email address is yours and receive your couple code, click the button below:

[bouton: Confirm my address | {lien}]

petit: If the button doesn't work, copy this link into your browser: {lien}

petit: If you didn't sign up, simply ignore this message.` },
  },
  {
    cle: 'bienvenue', famille: 'inscription', nom: 'Bienvenue (avec le code couple)',
    quand: 'Une fois l’adresse confirmée.',
    obligatoires: ['code'],
    fr: { objet: 'Bienvenue sur YES BOX — voici votre code couple', corps: `${BONJOUR.fr}

Votre compte YES BOX — Le Pacte est créé !

Voici votre code couple, à transmettre à la personne avec qui vous voulez signer votre pacte :

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
    fr: { objet: '{invite_par} vous invite à écrire votre pacte de couple', corps: `Bonjour,

{invite_par} a commencé YES BOX et vous invite à le faire à deux.

YES BOX, ce sont des modules simples et ludiques pour parler de ce qui compte : chacun·e répond de son côté, puis vous découvrez vos réponses ensemble. Le module 1 est gratuit pour vous deux, sans carte bancaire.

[bouton: Rejoindre notre espace | {lien}]

Vous pouvez aussi créer votre compte sur le site et saisir le code de votre couple : **{code}**` },
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

Vous avez demandé à changer votre mot de passe YES BOX. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :

[bouton: Choisir un nouveau mot de passe | {lien}]

petit: Ce lien est valable 1 heure et ne sert qu’une fois. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : {lien}

petit: Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.` },
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
    fr: { objet: 'Votre nouveau mot de passe YES BOX', corps: `${BONJOUR.fr}

Voici votre nouveau mot de passe pour vous connecter à votre espace YES BOX — Le Pacte :

[code: {mot_de_passe}]

Connectez-vous, puis changez-le si vous le souhaitez depuis votre espace.` },
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
    cle: 'relance_reponses_a_ton_tour', famille: 'relances', nom: 'Relance — l’autre attend vos réponses', rappel: true,
    quand: '10 jours sans avancer (puis 20 jours), quand un seul membre a répondu au module en cours. Envoyé à celui ou celle qui n’a pas répondu.',
    fr: { objet: '{partenaire} vous attend dans « {module} »', corps: `${BONJOUR.fr}

${PAUSE.fr} {partenaire} a terminé ses réponses au module « {module} » et attend les tiennes pour que vous puissiez les découvrir ensemble.

Pas besoin d’y passer des heures : un moment au calme suffit. Vos réponses restent cachées jusqu’à ce que vous ayez terminé de part et d’autre.

[bouton: Reprendre le module | {lien}]

${EQUIPE.fr}` },
    en: { objet: '{partenaire} is waiting for you in "{module}"', corps: `${BONJOUR.en}

${PAUSE.en} {partenaire} has finished their answers to the "{module}" module and is waiting for yours so you can discover them together.

No need to spend hours on it: a quiet moment is enough. Your answers stay hidden until you have both finished.

[bouton: Resume the module | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'relance_conclusion_a_ton_tour', famille: 'relances', nom: 'Relance — l’autre attend votre conclusion', rappel: true,
    quand: '10 jours sans avancer (puis 20 jours), quand un seul membre a écrit sa conclusion du module.',
    fr: { objet: '{partenaire} vous attend dans « {module} »', corps: `${BONJOUR.fr}

${PAUSE.fr} {partenaire} a écrit sa conclusion du module « {module} » et attend la tienne : le module suivant se débloquera dès que vos deux conclusions seront dans le journal.

Quelques lignes suffisent : ce que vous avez appris, ce qui vous a surpris·e.

[bouton: Écrire ma conclusion | {lien}]

${EQUIPE.fr}` },
    en: { objet: '{partenaire} is waiting for you in "{module}"', corps: `${BONJOUR.en}

${PAUSE.en} {partenaire} has written their conclusion for the "{module}" module and is waiting for yours: the next module will unlock as soon as both your conclusions are in the journal.

A few lines are enough: what you learned, what surprised you.

[bouton: Write my conclusion | {lien}]

${EQUIPE.en}` },
  },
  {
    cle: 'relance_pacte_a_signer', famille: 'relances', nom: 'Relance — l’autre attend votre signature du pacte', rappel: true,
    quand: '10 jours sans avancer (puis 20 jours), quand un seul membre a signé le pacte.',
    fr: { objet: '{partenaire} vous attend dans « {module} »', corps: `${BONJOUR.fr}

${PAUSE.fr} {partenaire} a signé votre pacte et attend votre signature pour clore le programme.

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
    cle: 'relance_non_paire_1', famille: 'relances', nom: 'Relance — couple pas encore au complet (1re)', rappel: true,
    quand: '3 jours après l’e-mail de bienvenue, quand personne n’a encore rejoint le couple. Envoyé à la personne inscrite.',
    obligatoires: ['code', 'lien'],
    fr: { objet: 'Il ne manque plus qu’une personne pour commencer YES BOX', corps: `${BONJOUR.fr}

Votre compte YES BOX — Le Pacte est prêt, mais votre couple n’est pas encore au complet : YES BOX se fait à deux.

[image: YES BOX, ce sont 8 modules et 1 pacte | {site}/emails/8-modules-et-1-pacte.png | {lien}]

Le principe : 8 modules à faire à deux et à votre rythme. Chacun·e répond de son côté, puis vous découvrez les réponses de l’autre et vous en parlez. À la fin, un pacte de couple à signer, à renouveler chaque année pour vous redire oui, en conscience.

Pour commencer, transmettez ce code à la personne avec qui vous voulez signer votre pacte. Elle le saisira en créant son compte :

[code: {code}]

Vous pouvez aussi lui envoyer une invitation par e-mail depuis votre espace :

[bouton: Inviter mon ou ma partenaire | {lien}]

petit: Le premier module est gratuit.

${EQUIPE.fr}` },
    en: { objet: 'Just one more person to get started with YES BOX', corps: `${BONJOUR.en}

Your YES BOX — Le Pacte account is ready, but your couple isn’t complete yet: YES BOX is done as a pair.

How it works: 8 modules to do together, at your own pace. Each of you answers on your own, then you discover each other’s answers and talk about them. At the end, a couple’s pact to sign, and to renew every year to say yes again, mindfully.

To get started, share this code with the person you want to sign your pact with. They’ll enter it when creating their account:

[code: {code}]

You can also send them an email invitation from your account:

[bouton: Invite my partner | {lien}]

petit: The first module is free.

${EQUIPE.en}` },
  },
  {
    cle: 'relance_non_paire_2', famille: 'relances', nom: 'Relance — couple pas encore au complet (2de)', rappel: true,
    quand: '10 jours après l’e-mail de bienvenue, quand personne n’a encore rejoint le couple. Envoyé à la personne inscrite. Dernière relance.',
    obligatoires: ['code', 'lien'],
    fr: { objet: 'À quel point prenez-vous soin de votre couple ?', corps: `${BONJOUR.fr}

[image: Et vous ? À quel point prenez-vous soin de votre couple ? Module 1 offert | {site}/emails/prenez-vous-soin-de-votre-couple.png | {lien}]

On prend soin de sa santé, de son travail, de ses proches… et le couple passe souvent après. YES BOX vous offre des moments rien qu’à deux pour parler de ce qui compte vraiment, que vous soyez ensemble depuis 2 mois ou 20 ans.

Votre couple n’est toujours pas au complet sur YES BOX. Il suffit que la personne avec qui vous voulez signer votre pacte crée son compte avec ce code :

[code: {code}]

[bouton: Inviter mon ou ma partenaire | {lien}]

petit: Le premier module est gratuit, pour vous deux. Et si ce n’est pas le bon moment, aucun souci : votre compte vous attend.

${EQUIPE.fr}` },
    en: { objet: 'How much do you take care of your relationship?', corps: `${BONJOUR.en}

We take care of our health, our work, our loved ones… and our relationship often comes last. YES BOX gives you moments just for the two of you to talk about what really matters, whether you’ve been together for 2 months or 20 years.

Your couple still isn’t complete on YES BOX. All it takes is for the person you want to sign your pact with to create their account with this code:

[code: {code}]

[bouton: Invite my partner | {lien}]

petit: The first module is free, for both of you. And if now isn’t the right time, no problem: your account will be waiting.

${EQUIPE.en}` },
  },
  {
    cle: 'relance_jamais_commence_1', famille: 'relances', nom: 'Relance — couple au complet qui n’a pas commencé (1re)', rappel: true,
    quand: '3 jours après l’arrivée du second membre, quand aucun des deux n’a encore répondu à une question. Envoyé aux deux.',
    obligatoires: ['lien'],
    fr: { objet: 'Vous êtes au complet : à vous de jouer !', corps: `${BONJOUR.fr}

{partenaire} et vous êtes bien pairé·es sur YES BOX… mais votre premier module, « {module} », n’a pas encore commencé.

[image: Quand avez-vous pris du temps rien que pour vous deux… pour la dernière fois ? | {site}/emails/du-temps-rien-que-pour-vous-deux.png | {lien}]

Avec YES BOX, c’est simple : chacun·e répond de son côté, à son rythme. Vos réponses restent cachées jusqu’à ce que vous ayez terminé de part et d’autre. Ensuite, vous les découvrez ensemble et vous en parlez.

Une idée : choisissez dès maintenant un moment au calme cette semaine pour y répondre, chacun·e de votre côté.

[bouton: Commencer le premier module | {lien}]

petit: Le premier module est gratuit.

${EQUIPE.fr}` },
    en: { objet: 'You’re all set: your turn to play!', corps: `${BONJOUR.en}

{partenaire} and you are paired up on YES BOX… but your first module, "{module}", hasn’t started yet.

With YES BOX, it’s simple: each of you answers on your own, at your own pace. Your answers stay hidden until you have both finished. Then you discover them together and talk about them.

An idea: pick a quiet moment this week right now to answer, each on your own.

[bouton: Start the first module | {lien}]

petit: The first module is free.

${EQUIPE.en}` },
  },
  {
    cle: 'relance_jamais_commence_2', famille: 'relances', nom: 'Relance — couple au complet qui n’a pas commencé (2de)', rappel: true,
    quand: '10 jours après l’arrivée du second membre, quand aucun des deux n’a encore répondu à une question. Envoyé aux deux. Dernière relance.',
    obligatoires: ['lien'],
    fr: { objet: 'Et vous, à quel point prenez-vous soin de votre couple ?', corps: `${BONJOUR.fr}

[image: Et vous ? À quel point prenez-vous soin de votre couple ? Module 1 offert | {site}/emails/prenez-vous-soin-de-votre-couple.png | {lien}]

On prend soin de sa santé, de son travail, de ses proches… et le couple passe souvent après. Pourtant, quelques moments à deux suffisent pour se redire ce qui compte.

Votre premier module, « {module} », vous attend toujours, {partenaire} et vous. Pas besoin d’y passer des heures : vous avancez à votre rythme, un module après l’autre.

[bouton: Commencer le premier module | {lien}]

petit: Le premier module est gratuit. Et si ce n’est pas le bon moment, aucun souci : votre espace vous attend.

${EQUIPE.fr}` },
    en: { objet: 'How much do you take care of your relationship?', corps: `${BONJOUR.en}

We take care of our health, our work, our loved ones… and our relationship often comes last. Yet a few moments together are enough to remind each other of what matters.

Your first module, "{module}", is still waiting for you, {partenaire} and you. No need to spend hours on it: you move forward at your own pace, one module at a time.

[bouton: Start the first module | {lien}]

petit: The first module is free. And if now isn’t the right time, no problem: your space will be waiting.

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
    cle: 'module_reponses_a_ton_tour', famille: 'modules', nom: 'L’autre a fini de répondre — à votre tour',
    quand: 'Quand un membre a répondu à toutes les questions d’un module et pas l’autre. Envoyé à l’autre.',
    fr: { objet: '{partenaire} a terminé le module « {module} » — à votre tour !', corps: `${BONJOUR.fr}

{partenaire} vient de répondre à toutes les questions du module « {module} ».

À votre tour ! Ses réponses restent cachées tant que vous n’avez pas répondu : vous les découvrirez ensemble.

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
    cle: 'module_conclusion_a_ton_tour', famille: 'modules', nom: 'L’autre a écrit sa conclusion — à votre tour',
    quand: 'Quand un membre a écrit sa conclusion du module et pas l’autre.',
    fr: { objet: '{partenaire} a écrit sa conclusion du module « {module} »', corps: `${BONJOUR.fr}

{partenaire} vient d'inscrire sa conclusion du module « {module} » dans votre journal.

À votre tour d’écrire la vôtre : le module suivant se débloquera dès que vos deux conclusions seront dans le journal.

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
    cle: 'pacte_a_ton_tour', famille: 'modules', nom: 'L’autre a signé le pacte — à votre tour',
    quand: 'Quand un membre a signé le pacte et pas l’autre.',
    fr: { objet: '{partenaire} a signé votre pacte', corps: `${BONJOUR.fr}

{partenaire} vient de signer votre pacte de couple.

À votre tour de le signer : le programme sera terminé dès que vos deux signatures seront posées.

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

Un mot sur votre expérience ? [lien: Laissez votre avis | {lien_avis}] : une fois publié, vous recevez un code de 10 € de réduction.

À bientôt, et prenez soin de vous et de votre couple.

[bouton: Voir notre tableau de bord | {lien}]` },
    en: { objet: 'Your pact is signed', corps: `${BONJOUR.en}

{partenaire} just signed too: your couple's pact now bears both your signatures.

Congratulations on everything you've been through together!

{phrase_abonnement}

You'll receive messages regularly throughout the year (2 per month at most) to keep strengthening your relationship, until the date you set for your yearly date.

On that day, a special module will be waiting for you, and we'll guide you beforehand so you can prepare for it properly. You'll find the date of your yearly date on your dashboard.

A word about your experience? [lien: Leave your review | {lien_avis}]: once it is published, you get a €10 discount code.

See you soon, and take care of yourselves and your relationship.

[bouton: See our dashboard | {lien}]` },
  },
]

// ---------------------------------------------------------------------------
// Rendez-vous mensuels & bilan annuel
// ---------------------------------------------------------------------------

// Thèmes des e-mails du mois après la signature du pacte, envoyés une seule
// fois chacun, dans cet ordre (cf. rappels-email.ts) : pas de boucle, une
// fois le dernier envoyé, plus d'e-mail du mois jusqu'à l'ajout d'un nouveau
// thème. Pas d'e-mail du mois les mois des fêtes de fin d'année, de la Saint-Valentin, du
// rendez-vous annuel et des anniversaires de couple ou de mariage : le thème
// suivant attend le mois d'après. Les textes ne disent donc jamais « il y a
// un mois » ni « le 9e mois » : le rang d'un thème n'est pas un numéro de mois.
// `cle` : identifiant du modèle (ne jamais changer celui d'un thème déjà
// envoyé : il sert à retrouver la question du mois sur la page « Nos
// rendez-vous annuels »). Un nouveau thème s'ajoute avec une nouvelle clé.
// `suite` : fin d'e-mail propre au thème, à la place du texte et du bouton
// « Noter nos réponses » communs.
const THEMES: { cle: string; fr: ContenuEmail; en: ContenuEmail; question: [string, string]; suite?: { fr: string; en: string } }[] = [
  {
    cle: 'mensuel_1',
    fr: { objet: 'Il y a quelques semaines, vous avez signé votre pacte 💍', corps: `Il y a quelques semaines, {partenaire} et vous avez signé votre pacte. Bravo : beaucoup de couples n’osent jamais mettre des mots sur ce qui compte vraiment à deux.

**« Et si vous vous bloquiez un rendez-vous régulier dans l’agenda ?**
**Une soirée par mois par exemple, sans écran, rien que tous les deux. Ou une pause déjeuner en semaine. Faites en fonction de ce qui est possible…**
**Pas besoin d’un grand programme : un repas, une balade, et surtout une conversation sans téléphone à portée de main.**
**Et pourquoi ne pas l’organiser à tour de rôle ? »**` },
    en: { objet: 'A few weeks ago, you signed your pact 💍', corps: `A few weeks ago, {partenaire} and you signed your pact. Well done: many couples never dare to put into words what truly matters to them as a pair.

**"What if you blocked out a regular date in your calendar?**
**One evening a month, for example, screen-free, just the two of you. Or a lunch break during the week. Go with what’s possible…**
**No need for big plans: a meal, a walk, and above all a conversation with no phone within reach.**
**And why not take turns organising it?"**` },
    question: ['Et si vous vous bloquiez un rendez-vous régulier dans l’agenda ? Qu’aimerais-tu organiser, et comment aimerais-tu le faire ?', 'What if you blocked out a regular date in your calendar? What would you like to organise, and how would you like to do it?'],
    suite: {
      fr: `Cliquez ici pour noter ce que vous aimeriez organiser et comment vous aimeriez le faire. Comme pour le programme initial, comparez vos réponses et lancez-vous !

[bouton: À vous de jouer | {lien}]`,
      en: `Click here to note what you would like to organise and how you would like to do it. Just like in the initial program, compare your answers and go for it!

[bouton: Your turn | {lien}]`,
    },
  },
  {
    cle: 'mensuel_2',
    fr: { objet: 'Et si vous vous disiez merci ?', corps: `Dans votre pacte, vous avez parlé de gratitude. Ce mois-ci, petit défi : dites à {partenaire} une chose précise que vous avez appréciée cette semaine. Pas un « merci pour tout », un vrai détail.

Ça prend 30 secondes, et c’est souvent ce qu’on oublie le plus vite.` },
    en: { objet: 'What if you said thank you?', corps: `In your pact, you talked about gratitude. This month, a little challenge: tell {partenaire} one specific thing you appreciated this week. Not a "thanks for everything", a real detail.

It takes 30 seconds, and it’s often what we forget first.` },
    question: ['Quelle chose précise ai-je appréciée chez l’autre ce mois-ci ?', 'What specific thing did I appreciate about the other this month?'],
  },
  {
    cle: 'mensuel_3',
    fr: { objet: 'Votre socle tient-il bon ?', corps: `Au moment d’écrire votre pacte, vous avez choisi les 3 principes de base d’un couple heureux… et du vôtre en particulier.

Ce mois-ci, relisez-les ensemble : **lequel avez-vous le plus vécu ces dernières semaines ? Lequel aimeriez-vous soigner davantage ?**` },
    en: { objet: 'Is your foundation holding strong?', corps: `When writing your pact, you chose the 3 core principles of a happy couple… and of yours in particular.

This month, reread them together: **which one have you lived the most these past weeks? Which one would you like to nurture more?**` },
    question: ['Lequel de nos 3 principes avons-nous le plus vécu ? Lequel aimerions-nous soigner davantage ?', 'Which of our 3 principles did we live most? Which one would we like to nurture more?'],
  },
  {
    cle: 'mensuel_renoncer',
    fr: { objet: 'Ce que vous avez choisi de faire moins', corps: `En écrivant votre pacte, chacun·e a noté **une chose à laquelle renoncer, ou à faire moins** pour l’autre.

Ce mois-ci, relisez vos deux réponses dans votre pacte, et posez-vous honnêtement la question : **avez-vous réussi à tenir cet engagement ?**

Si oui, bravo : dites-vous ce que ça a changé entre vous. Si c’est plus difficile que prévu, pas de culpabilité : réfléchissez ensemble à **la meilleure manière d’y arriver**. Un premier petit pas, un signal convenu entre vous, un moment de la journée où faire plus attention… À deux, c’est plus facile.` },
    en: { objet: 'What you chose to do less', corps: `When writing your pact, each of you wrote down **one thing to give up, or to do less**, for the other.

This month, reread both your answers in your pact, and ask yourselves honestly: **have you managed to keep this commitment?**

If so, well done: tell each other what it has changed between you. If it’s harder than expected, no guilt: think together about **the best way to get there**. A first small step, a signal agreed between you, a time of day to pay more attention… It’s easier as a pair.` },
    question: ['Ce à quoi j’ai renoncé, ou que je me suis engagé·e à faire moins : ai-je réussi ? Qu’est-ce qui m’aiderait à y arriver ?', 'What I gave up, or committed to doing less: have I managed it? What would help me get there?'],
  },
  {
    cle: 'mensuel_5',
    fr: { objet: 'Le désaccord du mois', corps: `En écrivant votre pacte, vous avez classé vos désaccords : négociable, pas encore réfléchi, rédhibitoire.

Ce mois-ci, choisissez **un désaccord « négociable »** et prenez un moment calme pour en reparler. L’objectif n’est pas de gagner, mais de comprendre ce qui compte pour l’autre.` },
    en: { objet: 'The disagreement of the month', corps: `When writing your pact, you sorted your disagreements: negotiable, not yet thought through, dealbreaker.

This month, pick **one "negotiable" disagreement** and take a calm moment to talk about it again. The goal isn’t to win, but to understand what matters to the other person.` },
    question: ['Quel désaccord « négociable » avons-nous repris, et qu’avons-nous compris de l’autre ?', 'Which "negotiable" disagreement did we revisit, and what did we understand about each other?'],
  },
  {
    cle: 'mensuel_6',
    fr: { objet: 'Mi-parcours de votre année', corps: `Votre pacte a déjà plusieurs mois. C’est le bon moment pour le relire ensemble.

**Y a-t-il un engagement à ajuster, à préciser, ou un nouveau à ajouter ?** Un pacte vivant, c’est un pacte qui évolue avec vous.` },
    en: { objet: 'Halfway through your year', corps: `Your pact is already a few months old. It’s the right time to reread it together.

**Is there a commitment to adjust, clarify, or a new one to add?** A living pact is one that grows with you.` },
    question: ['Y a-t-il un engagement de notre pacte à ajuster, à préciser ou à ajouter ?', 'Is there a commitment in our pact to adjust, clarify or add?'],
  },
  {
    cle: 'mensuel_7',
    fr: { objet: 'Le geste qui vous rapproche', corps: `Vous vous êtes choisi un geste ou un code de rapprochement. Ce mois-ci, faites-le vivre : **utilisez-le au moins une fois par semaine**.

Ce sont ces petits signes qui entretiennent la complicité au quotidien.` },
    en: { objet: 'The gesture that brings you closer', corps: `You chose a gesture or code to reconnect. This month, bring it to life: **use it at least once a week**.

These small signs are what keep your bond alive day to day.` },
    question: ['Comment avons-nous fait vivre notre geste de rapprochement ?', 'How did we keep our closeness gesture alive?'],
  },
  {
    cle: 'mensuel_8',
    fr: { objet: 'Qu’est-ce qui a changé entre vous ?', corps: `Depuis le début de votre parcours, des choses ont bougé, même discrètement.

Ce mois-ci, prenez un moment pour vous le dire : **qu’est-ce qui va mieux entre vous ? Qu’est-ce que vous voulez garder précieusement ?**` },
    en: { objet: 'What has changed between you?', corps: `Since you started your program, things have shifted, even quietly.

This month, take a moment to tell each other: **what is going better between you? What do you want to hold on to?**` },
    question: ['Qu’est-ce qui va mieux entre nous ? Que voulons-nous garder précieusement ?', 'What is going better between us? What do we want to treasure?'],
  },
  {
    cle: 'mensuel_9',
    fr: { objet: 'Vos rêves à deux', corps: `Un voyage, un projet, une envie dont vous parlez depuis longtemps ?

Ce mois-ci, choisissez **un projet commun et faites-le avancer d’un pas** : une date, une réservation, un premier rendez-vous.

Et voyez plus loin : **faites des projets à 6 mois, à 1 an et à 5 ans**.` },
    en: { objet: 'Your shared dreams', corps: `A trip, a project, something you’ve been talking about for a long time?

This month, choose **one shared project and move it forward by one step**: a date, a booking, a first appointment.

And look further ahead: **make plans for 6 months, 1 year and 5 years from now**.` },
    question: ['Quel projet commun avons-nous fait avancer, et de quel pas ? Quels sont nos projets à 6 mois, à 1 an et à 5 ans ?', 'Which shared project did we move forward, and by what step? What are our plans for 6 months, 1 year and 5 years?'],
  },
  {
    cle: 'mensuel_10',
    fr: { objet: 'Prendre soin de soi pour prendre soin du couple', corps: `Un couple solide, c’est aussi deux personnes qui vont bien.

Ce mois-ci, posez-vous la question séparément, puis partagez vos réponses : **de quoi ai-je besoin en ce moment ? Qu’est-ce que l’autre pourrait faire pour m’aider ?**` },
    en: { objet: 'Taking care of yourself to take care of your couple', corps: `A strong couple is also two people who are doing well.

This month, ask yourselves separately, then share your answers: **what do I need right now? What could the other person do to help me?**` },
    question: ['De quoi ai-je besoin en ce moment ? Qu’est-ce que l’autre pourrait faire pour m’aider ?', 'What do I need right now? What could the other do to help me?'],
  },
  {
    cle: 'mensuel_11',
    fr: { objet: 'La gratitude, encore', corps: `Ce mois-ci, un petit geste : écris un mot à {partenaire}. Quelques lignes sur un papier, un message, peu importe.

Dites-lui ce que vous appréciez le plus en ce moment dans votre relation. C’est simple, et ça marque longtemps.` },
    en: { objet: 'Gratitude, once more', corps: `This month, a small gesture: write a note to {partenaire}. A few lines on paper, a message, it doesn’t matter.

Tell them what you appreciate most in your relationship right now. It’s simple, and it stays with you for a long time.` },
    question: ['Qu’ai-je écrit à l’autre, et qu’est-ce que ce mot a changé ?', 'What did I write to the other, and what did that note change?'],
  },
  {
    cle: 'mensuel_serviable',
    fr: { objet: 'Rendre service, juste pour faire plaisir', corps: `Ce mois-ci, un défi tout simple : **rendez service à l’autre, gratuitement, juste pour lui faire plaisir**.

Pas parce que c’est votre tour, ni pour attendre quelque chose en retour : préparer son café, vous charger d’une corvée que l’autre n’aime pas, anticiper un petit besoin, faire une course à sa place… Ces attentions gratuites disent « je pense à toi » sans un mot.` },
    en: { objet: 'Doing something kind, just to please', corps: `This month, a very simple challenge: **do something helpful for the other, for free, just to make them happy**.

Not because it’s your turn, nor to get something in return: making their coffee, taking on a chore the other dislikes, anticipating a small need, running an errand for them… These freely given gestures say "I’m thinking of you" without a word.` },
    question: ['Quel service ai-je rendu à l’autre, juste pour lui faire plaisir ? Et lequel m’a touché·e ?', 'What did I do for the other, just to make them happy? And which of their gestures touched me?'],
  },
  {
    cle: 'mensuel_toucher',
    fr: { objet: 'Le pouvoir du toucher', corps: `Une main posée sur l’épaule, un câlin qui dure un peu plus longtemps, des doigts entrelacés en marchant, un massage devant un film… Le toucher rapproche, apaise et rassure, souvent mieux que les mots.

Ce mois-ci, **soyez plus tactiles entre vous** : multipliez les gestes tendres au quotidien, sans autre intention que d’être proches. Et dites-vous quels gestes vous font le plus de bien : chacun·e a les siens.` },
    en: { objet: 'The power of touch', corps: `A hand on the shoulder, a hug that lasts a little longer, fingers intertwined while walking, a massage in front of a film… Touch brings you closer, soothes and reassures, often better than words.

This month, **be more physically affectionate with each other**: add more tender gestures to your everyday life, with no other intention than being close. And tell each other which gestures feel best: everyone has their own.` },
    question: ['Quels gestes tendres me font le plus de bien ? Lesquels avons-nous ajoutés à notre quotidien ce mois-ci ?', 'Which tender gestures feel best to me? Which ones did we add to our everyday life this month?'],
  },
  {
    cle: 'mensuel_intimite',
    fr: { objet: 'Un peu de fun sous la couette ?', corps: `**Et si ce mois-ci, vous mettiez un peu de fun sous la couette ?** Une envie dont vous n’avez jamais parlé, un moment improvisé, un fou rire, une soirée sans réveil le lendemain… L’intimité aussi a besoin de légèreté et de nouveauté.

L’essentiel : que chacun·e se sente libre et en confiance, et puisse dire oui comme non.

Si besoin, relisez ensemble vos réponses du module « Tendresse et intimité » : c’est un bon point de départ pour en parler.

[lien: Relire le module « Tendresse et intimité » | {lien_intimite}]` },
    en: { objet: 'A little fun under the covers?', corps: `**What if this month, you brought a little fun under the covers?** A desire you’ve never talked about, a spontaneous moment, a fit of giggles, an evening with no alarm the next morning… Intimacy needs lightness and novelty too.

What matters most: that each of you feels free and safe, and can say yes as well as no.

If needed, reread your answers to the "Tenderness and Intimacy" module together: it’s a good starting point to talk about it.

[lien: Reread the "Tenderness and Intimacy" module | {lien_intimite}]` },
    question: ['Quelle envie aimerais-je partager pour mettre un peu de fun dans notre intimité ?', 'What desire would I like to share to bring a little fun into our intimacy?'],
  },
  {
    cle: 'mensuel_originalite',
    fr: { objet: 'Faites quelque chose que vous n’avez jamais fait', corps: `Ce mois-ci, sortez de vos habitudes : **faites ensemble quelque chose que vous n’avez jamais fait**.

Partez visiter votre ville comme deux touristes, louez un scooter, testez une activité improbable, montez dans un train pour une destination tirée au sort…

Voyez la vie en grand : personne d’autre ne le fera à votre place !` },
    en: { objet: 'Do something you’ve never done', corps: `This month, break out of your routine: **do something together that you’ve never done before**.

Explore your own city like two tourists, rent a scooter, try an unlikely activity, hop on a train to a destination picked at random…

Think big: nobody else will do it for you!` },
    question: ['Qu’avons-nous fait pour la première fois ensemble, et qu’est-ce que ça nous a apporté ?', 'What did we do together for the first time, and what did it bring us?'],
  },
  {
    cle: 'mensuel_rire',
    fr: { objet: 'Riez !', corps: `**Le rire est le ciment du couple.** Ce mois-ci, saisissez toutes les occasions de retrouver cette complicité : regardez un spectacle d’humour, sortez dans un comedy club, ressortez vos souvenirs les plus drôles, laissez-vous aller aux fous rires.

Bref : riez !` },
    en: { objet: 'Laugh!', corps: `**Laughter is what holds a couple together.** This month, seize every opportunity to find that closeness again: watch a comedy show, go to a comedy club, bring up your funniest memories, let yourselves get carried away by fits of laughter.

In short: laugh!` },
    question: ['Quel a été notre plus beau fou rire ce mois-ci ?', 'What was our best fit of laughter this month?'],
  },
  {
    cle: 'mensuel_humilite',
    fr: { objet: 'Le courage de l’humilité', corps: `Ce mois-ci, un exercice qui demande un peu de courage : **reconnaissez vos limites ou vos erreurs**. Un « tu avais raison », un « je me suis trompé·e », un « là, j’ai besoin d’aide »…

Et sachez aussi rire de vous-même. Bonne nouvelle : l’humilité est très contagieuse.` },
    en: { objet: 'The courage of humility', corps: `This month, an exercise that takes a little courage: **acknowledge your limits or your mistakes**. A "you were right", an "I got it wrong", a "right now, I need help"…

And learn to laugh at yourself too. Good news: humility is very contagious.` },
    question: ['Quelle limite ou quelle erreur ai-je reconnue ce mois-ci ? Comment a-t-elle été accueillie ?', 'What limit or mistake did I acknowledge this month? How was it received?'],
  },
  {
    cle: 'mensuel_jeux',
    fr: { objet: 'Soirée jeux !', corps: `Ce mois-ci, **ressortez les jeux de société ou un jeu de cartes, et jouez ensemble**. Un classique de votre enfance, un jeu coopératif, une revanche attendue depuis longtemps…

Peu importe qui gagne : l’essentiel, c’est de vous amuser ensemble.` },
    en: { objet: 'Game night!', corps: `This month, **get out the board games or a deck of cards, and play together**. A childhood classic, a cooperative game, a long-awaited rematch…

It doesn’t matter who wins: what matters is having fun together.` },
    question: ['À quoi avons-nous joué, et qu’avons-nous découvert de l’autre en jouant ?', 'What did we play, and what did we discover about each other while playing?'],
  },
]

// Thèmes retirés du catalogue, déjà envoyés à certains couples : leur question
// reste affichée sur la page « Nos rendez-vous annuels ».
const THEMES_RETIRES: Record<string, { objet: [string, string]; question: [string, string] }> = {
  mensuel_4: {
    objet: ['Un moment rien qu’à vous', 'A moment just for the two of you'],
    question: ['Notre soirée sans écran : qu’avons-nous fait, et qu’en retenons-nous ?', 'Our screen-free evening: what did we do, and what do we take from it?'],
  },
}

// Ordre des thèmes (clés des modèles).
export const CLES_THEMES_MENSUELS = THEMES.map(theme => theme.cle)

// Titre (objet par défaut) et question d'un thème, pour la page « Nos
// rendez-vous annuels » (null pour une clé inconnue).
export function themeMensuelParDefaut(cle: string): { objet: Record<'fr' | 'en', string>; question: Record<'fr' | 'en', string> } | null {
  const theme = THEMES.find(x => x.cle === cle)
  if (theme) return { objet: { fr: theme.fr.objet, en: theme.en.objet }, question: { fr: theme.question[0], en: theme.question[1] } }
  const retire = THEMES_RETIRES[cle]
  if (retire) return { objet: { fr: retire.objet[0], en: retire.objet[1] }, question: { fr: retire.question[0], en: retire.question[1] } }
  return null
}

const MENSUELS: ModeleEmail[] = [
  ...THEMES.map((theme, i): ModeleEmail => ({
    cle: theme.cle, famille: 'mensuels', nom: `Thème ${i + 1} — ${theme.fr.objet}`, rappel: true,
    quand: i === 0
      ? '1er e-mail du mois, en principe 1 mois après la signature du pacte (plus tard si ce mois-là tombe pendant les fêtes de fin d’année, la Saint-Valentin, le rendez-vous annuel ou un anniversaire).'
      : `${i + 1}e e-mail du mois après la signature du pacte (une seule fois ; pas d’e-mail du mois les mois des fêtes de fin d’année, de la Saint-Valentin, du rendez-vous annuel et des anniversaires de couple ou de mariage).`,
    facultatives: ['rappel_rdv'],
    fr: { objet: theme.fr.objet, corps: `${BONJOUR.fr}

${theme.fr.corps}

${theme.suite?.fr ?? `Notez vos réponses dans « Nos rendez-vous annuels » : vous les retrouverez pour votre bilan annuel.

[bouton: Noter nos réponses | {lien}]`}

[lien: Relire notre pacte | {lien_pacte}]

petit: {rappel_rdv}

${EQUIPE.fr}` },
    en: { objet: theme.en.objet, corps: `${BONJOUR.en}

${theme.en.corps}

${theme.suite?.en ?? `Note your answers in "Our yearly dates": you’ll find them again for your yearly review.

[bouton: Note our answers | {lien}]`}

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
  {
    cle: 'noel', famille: 'mensuels', nom: 'Fêtes de fin d’année — un cadeau surprise', rappel: true,
    quand: 'Chaque année le 10 décembre (ou dans les jours qui suivent, jusqu’au 24), aux couples qui ont signé leur pacte. Pas d’e-mail du mois en décembre.',
    fr: { objet: 'Les fêtes de fin d’année approchent : et si vous vous faisiez une surprise ? 🎁', corps: `${BONJOUR.fr}

Les fêtes de fin d’année approchent ! Cette année, un défi : **prépare un cadeau surprise pour {partenaire}**.

Pas forcément cher ni spectaculaire : quelque chose qui lui ressemble et qui montre que vous l’écoutez vraiment. Un objet évoqué au détour d’une conversation, une expérience à vivre à deux, une photo souvenir à encadrer, une lettre, un bon pour un moment rien qu’à vous…

Le plus beau dans un cadeau surprise, c’est la surprise : chut, on ne dit rien !

Joyeuses fêtes à vous deux,
${EQUIPE.fr}` },
    en: { objet: 'The holiday season is coming: what about a surprise? 🎁', corps: `${BONJOUR.en}

The holiday season is coming! This year, a challenge: **prepare a surprise gift for {partenaire}**.

It doesn’t have to be expensive or spectacular: something that feels like them and shows you really listen. Something they mentioned in passing, an experience to share, a photo to frame, a letter, a voucher for a moment just for the two of you…

The best part of a surprise gift is the surprise: shh, not a word!

Happy holidays to you both,
${EQUIPE.en}` },
  },
  {
    cle: 'saint_valentin', famille: 'mensuels', nom: 'Saint-Valentin — une recette à deux', rappel: true,
    quand: 'Chaque année le 7 février (ou dans les jours qui suivent, jusqu’au 13), aux couples qui ont signé leur pacte. Pas d’e-mail du mois en février.',
    fr: { objet: 'Saint-Valentin : un moment gourmand à deux 💞', corps: `${BONJOUR.fr}

Pour la Saint-Valentin, nous vous proposons un moment sensuel à deux : **choisissez une recette à faire ensemble, et réalisez toutes les étapes à quatre mains**, avec douceur et gentillesse.

Soyez tactiles et gourmand·es. Essayez par exemple de fabriquer vos propres **gnocchis à la betterave**, entre pétrissage et travail d’équipe.

Régalez-vous !

Belle Saint-Valentin à vous deux,
${EQUIPE.fr}` },
    en: { objet: 'Valentine’s Day: a delicious moment for two 💞', corps: `${BONJOUR.en}

For Valentine’s Day, we suggest a sensual moment for two: **choose a recipe to make together, and do every step side by side**, gently and kindly.

Be tactile and indulgent. Try making your own **beetroot gnocchi**, for example, between kneading and teamwork.

Enjoy every bite!

Happy Valentine’s Day to you both,
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
    fr: '**Le défi du jour : un bocal à souvenirs.** Prenez un bocal ou une jolie boîte, et glissez-y chacun·e cinq petits papiers avec un souvenir heureux de l’année qui vient de s’écouler. Pour chacun, nommez le souvenir, le lieu, et détaillez les émotions ressenties. Lisez-les ensemble ce soir, puis gardez le bocal : il se remplira d’année en année.',
    en: '**Today’s challenge: a memory jar.** Take a jar or a pretty box, and each slip in five little notes with a happy memory from the past year. For each one, name the memory and the place, and describe the emotions you felt. Read them together tonight, then keep the jar: it will fill up year after year.',
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
  {
    cle: 'demande_avis', famille: 'abonnement', nom: 'Demande d’avis — en cours de parcours', rappel: true,
    quand: '2 jours après la fin du premier module (réponses dévoilées, conclusions des deux écrites), pacte pas encore signé. Indique le dernier module terminé à la date de l’envoi. Une seule fois, aux membres qui n’ont pas encore laissé d’avis.',
    fr: { objet: 'Comment vivez-vous votre parcours YES BOX ?', corps: `${BONJOUR.fr}

Vous avez terminé {avancement} : bravo d’avoir pris ce temps à deux !

Comment l’avez-vous vécu ? Votre avis compte beaucoup pour nous, et il aide d’autres couples à se lancer. Quelques lignes et une note suffisent, et chacun·e peut laisser le sien.

[bouton: Laisser mon avis | {site}/avis]

**Pour vous remercier :** une fois votre avis publié, vous recevez un bon de **10 €** à valoir sur la suite du programme, le pack initial ou l’abonnement annuel « Pacte – notre rendez-vous annuel ».

petit: Votre avis est relu par l’équipe avant d’être publié sur le site, avec votre prénom (vous pouvez le modifier, ou n’indiquer que votre initiale) et le mois où vous avez commencé. Le bon de 10 € s’ajoute dans Mon compte, rubrique « Ajouter un code », et se déduit de votre prochain paiement.

${EQUIPE.fr}` },
    en: { objet: 'How are you finding your YES BOX journey?', corps: `${BONJOUR.en}

You’ve finished {avancement}: well done for taking this time together!

How did you find it? Your review means a lot to us, and it helps other couples get started. A few lines and a rating are enough, and each of you can leave your own.

[bouton: Leave my review | {site}/avis]

**As a thank-you:** once your review is published, you get a **€10** voucher to use on the rest of the program, the starter pack or the "Pact – our yearly date" yearly subscription.

petit: Your review is read by the team before being published on the website, with your first name (you can change it, or only give your initial) and the month you started. The €10 voucher is added in My Account, under "Add a code", and is deducted from your next payment.

${EQUIPE.en}` },
  },
  {
    cle: 'demande_avis_pacte', famille: 'abonnement', nom: 'Demande d’avis — après la signature du pacte', rappel: true,
    quand: '2 jours après la signature du pacte par les deux. Une seule fois, aux membres qui n’ont pas encore laissé d’avis.',
    fr: { objet: 'Votre pacte est signé : un mot sur votre parcours ?', corps: `${BONJOUR.fr}

Il y a quelques jours, vous avez signé votre pacte de couple. Bravo à vous deux pour tout ce chemin parcouru ensemble !

Maintenant que vous avez vécu le parcours en entier, comment l’avez-vous trouvé ? Votre avis compte beaucoup pour nous, et il aide d’autres couples à se lancer. Quelques lignes et une note suffisent, et chacun·e peut laisser le sien.

[bouton: Laisser mon avis | {site}/avis]

**Pour vous remercier :** une fois votre avis publié, vous recevez un bon de **10 €** à valoir sur la suite du programme, par exemple l’abonnement annuel « Pacte – notre rendez-vous annuel », pour vous redire oui chaque année.

petit: Votre avis est relu par l’équipe avant d’être publié sur le site, avec votre prénom (vous pouvez le modifier, ou n’indiquer que votre initiale) et le mois où vous avez commencé. Le bon de 10 € s’ajoute dans Mon compte, rubrique « Ajouter un code », et se déduit de votre prochain paiement.

${EQUIPE.fr}` },
    en: { objet: 'Your pact is signed: a word about your journey?', corps: `${BONJOUR.en}

A few days ago, you signed your couple’s pact. Well done to you both for the whole journey you’ve made together!

Now that you’ve been through the whole program, how did you find it? Your review means a lot to us, and it helps other couples get started. A few lines and a rating are enough, and each of you can leave your own.

[bouton: Leave my review | {site}/avis]

**As a thank-you:** once your review is published, you get a **€10** voucher to use on the rest of the program, for example the "Pact – our yearly date" yearly subscription, to say yes again every year.

petit: Your review is read by the team before being published on the website, with your first name (you can change it, or only give your initial) and the month you started. The €10 voucher is added in My Account, under "Add a code", and is deducted from your next payment.

${EQUIPE.en}` },
  },
  {
    cle: 'parrainage_module_5', famille: 'abonnement', nom: 'Parrainage — à partir du module 5 (avec le code)', rappel: true,
    quand: 'Le lendemain de la fin du module 5 (réponses dévoilées, conclusions des deux écrites). Indique le dernier module terminé à la date de l’envoi. Une seule fois, aux deux membres.',
    obligatoires: ['code_parrainage'],
    fr: { objet: 'Déjà {numero} modules ! Faites découvrir YES BOX à d’autres couples', corps: `${BONJOUR.fr}

Vous avez terminé {avancement} : bravo à vous deux pour ce chemin parcouru !

Si YES BOX vous fait du bien, pourquoi ne pas en parler autour de vous ? Voici votre code de parrainage, à partager avec les couples de votre entourage :

[code: {code_parrainage}]

Ces couples saisissent votre code en créant leur compte, ou passent par votre lien : [lien: {site}/inscription?parrain={code_parrainage} | {site}/inscription?parrain={code_parrainage}]

**Tous les 5 couples qui s’inscrivent avec votre code, vous recevez un bon d’achat de 10 €**, déduit automatiquement de votre prochain paiement (pack initial ou abonnement annuel). Les bons se cumulent : 10 couples, 20 €, et ainsi de suite.

Dans Mon compte, rubrique Parrainage, vous retrouvez votre code, le crédit gagné et les couples inscrits grâce à vous, avec leur date d’inscription.

[bouton: Voir mon parrainage | {site}/mon-compte#parrainage]

${EQUIPE.fr}` },
    en: { objet: '{numero} modules already! Share YES BOX with other couples', corps: `${BONJOUR.en}

You’ve finished {avancement}: well done to you both for the journey so far!

If YES BOX is doing you good, why not tell the people around you? Here is your referral code, to share with couples you know:

[code: {code_parrainage}]

They enter it when creating their account, or use your link: [lien: {site}/inscription?parrain={code_parrainage} | {site}/inscription?parrain={code_parrainage}]

**For every 5 couples who sign up with your code, you get a €10 voucher**, automatically deducted from your next payment (starter pack or yearly subscription). Vouchers add up: 10 couples, €20, and so on.

In My Account, under Referrals, you’ll find your code, the credit you’ve earned and the couples who signed up thanks to you, with their sign-up date.

[bouton: See my referrals | {site}/mon-compte#parrainage]

${EQUIPE.en}` },
  },
  {
    cle: 'avis_publie', famille: 'abonnement', nom: 'Avis publié — code de 10 € de réduction',
    quand: 'Quand un avis est validé dans Vue d’ensemble > Tâches. Envoyé à la personne qui l’a écrit.',
    obligatoires: ['code'],
    fr: { objet: 'Merci pour votre avis : 10 € de réduction', corps: `${BONJOUR.fr}

Merci d’avoir pris le temps de partager votre expérience : votre avis est maintenant publié sur yesbox-lepacte.fr.

Pour vous remercier, voici un code de **10 € de réduction** :

[code: {code}]

Saisissez-le dans Mon compte, rubrique « Ajouter un code » : les 10 € seront déduits automatiquement de votre prochain paiement (pack initial ou rendez-vous annuel). Code utilisable une seule fois, par votre couple.

[bouton: Ajouter mon code | {lien}]

${EQUIPE.fr}` },
    en: { objet: 'Thank you for your review: €10 off', corps: `${BONJOUR.en}

Thank you for taking the time to share your experience: your review is now published on yesbox-lepacte.fr.

As a thank-you, here is a **€10 discount** code:

[code: {code}]

Enter it in My Account, under "Add a code": the €10 will be automatically deducted from your next payment (starter pack or yearly date). The code can be used once, by your couple.

[bouton: Add my code | {lien}]

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
