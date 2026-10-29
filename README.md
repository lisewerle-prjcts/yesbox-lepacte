# YES BOX — Le Pacte

Application Next.js 14 pour couples — construisez les fondations de votre relation avec intention.

## Stack

- **Next.js 14** (App Router + Server Actions)
- **Supabase** (Auth + PostgreSQL + RLS)
- **Tailwind CSS** (design system custom)
- **TypeScript**
- **Polices** : Fraunces + DM Sans

## Design System

- Couleur principale : `#D63E7A` (magenta)
- Fond : `#FAF6F0` (crème)
- Typographie : Fraunces (titres), DM Sans (corps)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/inscription` | Création de compte (couple + code de pairage créés immédiatement) |
| `/connexion` | Connexion |
| `/rejoindre?token=...` | Rejoindre un couple via token |
| `/tableau-de-bord` | Accueil — carte couple (code, invitation, anniversaire) |
| `/module/[slug]` | Parcours questions d'un module |
| `/pacte` | Progression — suivi des 8 modules et du pacte |
| `/journal` | Notre Pacte — document partagé et signature |
| `/rdv-annuels` | Nos rdv annuels — réponses aux questions du mois et bilan annuel (rendez-vous annuel) |
| `/mon-compte` | Infos personnelles, mot de passe, ajout d'un code |
| `/offrir` | Offrir une carte cadeau YES BOX (58 €) |
| `/avis` | Laisser un avis (validé dans Admin > Vue d'ensemble > Tâches, puis affiché sur l'accueil ; code de 10 € à la publication) |
| `/mot-de-passe-oublie` | Réinitialisation mot de passe |

## Le programme : 8 modules, le pacte, puis le rendez-vous annuel

Pack initial YES BOX — Le Pacte (module 1 gratuit, puis 58 €) :

1. 👁️ **Toi et Moi** — Se (re)découvrir (gratuit)
2. 💑 **Nous** — Notre histoire
3. 🏠 **Le quotidien** — La vie commune
4. 🎯 **Argent et projets** — Argent, travail, avenir
5. 🌳 **Famille et croyances**
6. 💬 **Gestion des émotions et communication** — Se parler, vraiment
7. 🔥 **Tendresse et intimité** — Tendresse et désir
8. ⚡ **Les disputes** — Désamorcer, grandir

Puis 📜 **Notre pacte de couple** (module `engagement`, n° 9 en interne),
écrit et signé à deux.

Ensuite, 🌱 **Notre rendez-vous annuel** (module `renouvellement`, n° 10 en
interne), à la date choisie à la signature du pacte : compris dans la
première année de la YES BOX, puis 19 €/an à chaque renouvellement.

## Installation

```bash
npm install
cp .env.local.example .env.local
# Remplis les variables Supabase dans .env.local
npm run dev
```

## Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Exécute `supabase/schema.sql` dans l'éditeur SQL
3. Configure les variables d'environnement

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Traduction en anglais des e-mails écrits dans l'admin (API Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Abonnements (Stripe)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Pack initial YES BOX – Le Pacte : prix à paiement unique à 58 €
STRIPE_PRICE_ID_YESBOX=price_...
# « Pacte – notre rendez-vous annuel » : prix récurrent annuel à 19 €
STRIPE_PRICE_ID_ABONNEMENT_ANNUEL=price_...
# Carte cadeau du pack initial (page /offrir) : prix à paiement unique à 58 €
STRIPE_PRICE_ID_CARTE_CADEAU_YESBOX=price_...
# Ancien abonnement mensuel (29 €/mois), plus vendu : à garder tant que des
# couples y sont abonnés
STRIPE_PRICE_ID_ABONNEMENT_MENSUEL=price_...
# Sécurise les tâches planifiées (effacement des comptes inactifs, rappels)
CRON_SECRET=...
```

## Pack initial et abonnement annuel (Stripe)

- Module 1 gratuit, puis **pack initial YES BOX – Le Pacte à 58 €**
  (`/abonnement`), paiement unique via Stripe Checkout (prix
  `STRIPE_PRICE_ID_YESBOX`, sans abonnement) : les 8 modules et la signature
  du pacte, avec 1 an pour les réaliser (`couples.pack_initial_expire_le`,
  cf. `src/lib/pack-initial.ts`). Le pack est ouvert par le webhook
  `checkout.session.completed` ou par la page de retour `/abonnement/merci`.
- **« Pacte – notre rendez-vous annuel » (19 €/an)**, facultatif
  (`STRIPE_PRICE_ID_ABONNEMENT_ANNUEL`) : nécessaire pour le module de
  renouvellement à la date choisie à la signature du pacte, et pour
  continuer le parcours au-delà de l'année du pack. Proposé une fois le pack
  obtenu (page Notre Pacte, `/abonnement`, Mon compte). Résiliable à tout
  moment : l'accès reste ouvert jusqu'au dernier jour de l'année payée.
- Sans abonnement, les couples qui ont signé leur pacte reçoivent toujours
  les e-mails du mois (2 par mois au maximum). Deux mois avant la date du
  rendez-vous annuel, un e-mail propose l'abonnement
  (`rdv_annuel_abonnement`).
- Un mois avant chaque renouvellement à 19 €, un e-mail l'annonce
  (`renouvellement_annuel_annonce`) ; un mois avant la fin du pack sans
  pacte signé, un e-mail propose de continuer à 19 €/an (`fin_pack_initial`).
- Anciens abonnements (mensuel à 29 €/mois, plus vendu) : à la signature du
  pacte, la bascule vers l'annuel est programmée (planning d'abonnement
  Stripe) à la fin du mois déjà payé ; « Rester au mensuel » (Mon compte)
  l'annule.
- Dans Stripe, activer l'e-mail de rappel avant renouvellement des
  abonnements (promis dans les conditions d'utilisation).
- Webhook Stripe à configurer sur `POST /api/webhooks/stripe` (événements
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`).
- Depuis `/mon-compte`, chaque couple voit sa date de renouvellement et peut
  arrêter (ou reprendre) le renouvellement automatique ; l'accès reste actif
  jusqu'à la fin de la période déjà payée.
- Après résiliation ou fin d'accès non renouvelée, seules les parties déjà
  réalisées restent consultables.

## Conservation des données : 24 mois d'inactivité

Un compte est effacé (profil, réponses, conclusions, pacte, puis le couple)
après 24 mois d'inactivité : aucune visite ni connexion d'un membre du
couple, aucune réponse, plus d'accès payé ou offert en cours
(`src/lib/conservation.ts`).

- Le proxy note la dernière visite de chaque personne connectée
  (`profiles.derniere_visite_le`, au plus toutes les 12 h) via la fonction
  SQL `marquer_visite`, qui repousse aussi la date d'effacement du couple.
- La tâche planifiée `GET /api/cron/purger-comptes-expires` (3 h UTC)
  recalcule chaque nuit `couples.effacement_prevu_le` et efface les comptes
  dont la date est passée. Une date n'est jamais fixée à moins de 61 jours
  de son premier calcul.
- E-mails d'avertissement 2 mois, 1 mois, 1 semaine et la veille (tâche
  `rappels-email`), envoyés à chaque membre même si les rappels sont
  désactivés ; une simple connexion repousse l'effacement de 24 mois.
- Nécessite le bloc « CONSERVATION : EFFACEMENT APRÈS 24 MOIS
  D'INACTIVITÉ » de `supabase/schema.sql`.

## Cartes cadeaux (page /offrir)

- Onglet « Offrir » (accueil et espace connecté) : la carte cadeau du pack
  initial YES BOX – Le Pacte (58 €), pour un autre couple ou pour son propre couple, payée via Stripe
  Checkout (paiement unique, prix `STRIPE_PRICE_ID_CARTE_CADEAU_YESBOX`).
- Après le paiement, un code `YES-XXXX-XXXX` est créé (webhook
  `checkout.session.completed` ou page `/offrir/merci`, une seule fois),
  envoyé par e-mail à la personne qui l'achète, avec la carte à imprimer
  `/offrir/carte/YES-XXXX-XXXX` (bouton « Télécharger / imprimer », PDF A5
  paysage via l'impression du navigateur).
- Valable 1 an, pour un seul couple : à l'inscription (champ code), sur
  `/abonnement` ou dans Mon compte > « Ajouter un code ». Le couple reçoit
  le pack initial pour 1 an à partir de l'activation (ou, s'il est déjà
  abonné à l'année, les 58 € en crédit Stripe déduit de ses prochains
  prélèvements).
- Les anciennes cartes de 1, 2 ou 3 mois restent utilisables.
- Admin > Cartes cadeaux : tous les codes, date d'achat, utilisation.
- Nécessite le bloc « CARTES CADEAUX » de `supabase/schema.sql`.

## Chiffrement des contenus

Les réponses aux modules, les conclusions du journal et le texte du pacte
sont chiffrés (AES-256-GCM) par le serveur avant d'être enregistrés : en
base, ils apparaissent sous la forme `enc:v1:…` (cf. `src/lib/chiffrement.ts`).

- Clé : variable `DONNEES_CLE_CHIFFREMENT` (au moins 32 caractères
  aléatoires), identique dans tous les environnements reliés à la même base.
- **Sans cette clé, les contenus chiffrés sont définitivement perdus** : la
  conserver dans un gestionnaire de mots de passe, ne jamais la changer.
- Les contenus enregistrés avant la mise en place sont chiffrés chaque nuit
  par `GET /api/cron/purger-comptes-expires` (réponse : `chiffres`).

## E-mails de rappel

Tâche planifiée quotidienne `GET /api/cron/rappels-email` (7 h UTC, cf.
`vercel.json`, protégée par `CRON_SECRET`), contenus dans
`src/lib/rappels-email.ts` :

- **Parcours en pause** : relance quand le couple n'a enregistré ni réponse
  ni conclusion depuis 10 jours, puis une seconde à 20 jours, pas plus. À la
  personne attendue si l'autre a fini, sinon aux deux. Pas de relance si
  l'accès au module en cours n'est pas ouvert (abonnement terminé).
- **Après la signature du pacte** : un e-mail par mois (thème différent
  chaque mois), et l'annonce du rendez-vous annuel dans le mois qui le
  précède, avec ou sans abonnement.
- **Abonnement annuel** : deux mois avant le rendez-vous annuel, sans
  abonnement, proposition de l'abonnement (19 €/an) pour ouvrir le module de
  renouvellement ; un mois avant chaque renouvellement, annonce du
  prélèvement (envoyée même si les rappels sont désactivés) ; un mois avant
  la fin du pack initial sans pacte signé, proposition de continuer à
  19 €/an. Nécessite les derniers blocs de `supabase/schema.sql`.
- **Passage à l'abonnement annuel** (couples encore au mensuel) : une fois le pacte signé, 5 jours avant
  la fin du mois payé, proposition de basculer de l'abonnement mensuel vers
  « Pacte – notre rendez-vous annuel » (lien vers l'offre de la page Notre
  Pacte, bascule programmée dans Stripe). Une seule fois par fin de mois,
  pas d'envoi si la bascule est déjà programmée. Nécessite le dernier bloc de
  `supabase/schema.sql`.
- Désinscription : case dans Mon compte, ou lien signé en bas de chaque
  e-mail (`/desinscription`). Signature : `RAPPELS_SECRET` si définie,
  sinon `CRON_SECRET`.

### Accès gratuits (testeurs) et parrainage

- **Codes testeurs** : `/admin/codes` permet de créer un code (durée en
  mois ou illimité, nombre d'utilisations). Le couple le saisit sur
  `/abonnement` ou depuis la carte « Ajouter un code » de `/mon-compte` —
  aucune carte bancaire n'est demandée. Un couple ne peut utiliser qu'un
  seul code gratuit (les cartes cadeaux, elles, se cumulent).
- **Parrainage** : chaque couple a un code et un lien à partager (carte
  « Parrainage » sur `/mon-compte`, aussi utilisable via `/inscription?parrain=CODE`).
  Au 5ᵉ couple parrainé qui s'inscrit (et à chaque palier de 5 suivant), le
  parrain reçoit automatiquement 10 € de réduction, crédités sur son compte
  client Stripe (créé au besoin) et déduits de son prochain paiement :
  appliqués en réduction sur le pack initial (paiement unique), ou déduits
  automatiquement de la facture de l'abonnement annuel. Un
  couple inscrit sans code peut saisir celui de son parrain après coup
  (Mon compte > « Ajouter un code »).
