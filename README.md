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
| `/pacte` | Progression — suivi des 7 modules |
| `/journal` | Notre Pacte — document partagé et signature |
| `/mon-compte` | Infos personnelles, mot de passe |
| `/mot-de-passe-oublie` | Réinitialisation mot de passe |

## Les 7 modules

1. 💎 **Nos Valeurs** — Le socle commun
2. 💬 **Notre Communication** — Rituels de dialogue
3. ❤️ **Notre Intimité** — Besoins affectifs
4. 💰 **Nos Finances** — Alignement financier
5. 🚀 **Nos Projets** — L'avenir ensemble
6. 🏡 **Notre Famille** — Visions familiales
7. 🌱 **Notre Croissance** — Développement mutuel

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

# Abonnements (Stripe)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_ABONNEMENT_MENSUEL=price_...
# « Pacte – notre rendez-vous annuel » : prix récurrent annuel à 19 €
STRIPE_PRICE_ID_ABONNEMENT_ANNUEL=price_...
# Optionnel : sécurise la tâche planifiée de clôture des comptes après 13 mois
CRON_SECRET=...
```

## Abonnement Stripe

- Offre : abonnement mensuel (29 €/mois), proposé aux couples à la fin du
  module 1 gratuit (`/abonnement`), payé et géré via Stripe Checkout.
- Offre « Pacte – notre rendez-vous annuel » (19 €/an), proposée une fois le
  pacte signé (page Notre Pacte, `/abonnement`, lien depuis `/mon-compte`).
  Un couple au mensuel valide la bascule : elle est programmée (planning
  d'abonnement Stripe) à la fin du mois déjà payé, où les 19 € sont prélevés
  sur la carte enregistrée ; « Rester au mensuel » (Mon compte) l'annule.
  Sans abonnement en cours, paiement immédiat via Stripe Checkout. Résiliable à
  tout moment : l'accès reste ouvert jusqu'au dernier jour de l'année payée.
  Dans Stripe, activer l'e-mail de rappel avant renouvellement des
  abonnements (promis dans les conditions d'utilisation).
- Webhook Stripe à configurer sur `POST /api/webhooks/stripe` (événements
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`).
- Depuis `/mon-compte`, chaque couple voit sa date de renouvellement et peut
  arrêter (ou reprendre) le renouvellement automatique ; l'accès reste actif
  jusqu'à la fin de la période déjà payée.
- Après résiliation ou fin d'accès non renouvelée, seules les parties déjà
  réalisées restent consultables ; les données sont conservées 13 mois puis
  le compte est définitivement clos par la tâche planifiée
  `GET /api/cron/purger-comptes-expires` (configurée dans `vercel.json`) :
  l'abonnement ne peut plus être réactivé sur ce couple, il faut recommencer
  avec un nouveau compte.

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
  précède. Arrêtés quand l'accès est terminé.
- **Passage à l'abonnement annuel** : une fois le pacte signé, 5 jours avant
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
  `/abonnement` ou depuis la carte « Abonnement » de `/mon-compte` — aucune
  carte bancaire n'est demandée. Un couple ne peut utiliser qu'un seul code.
- **Parrainage** : chaque couple a un code et un lien à partager (carte
  « Parrainage » sur `/mon-compte`, aussi utilisable via `/inscription?parrain=CODE`).
  Au 5ᵉ couple parrainé qui s'inscrit (et à chaque palier de 5 suivant), le
  parrain reçoit automatiquement 1 mois offert : crédité sur sa prochaine
  facture Stripe s'il paie déjà, sinon ajouté à son accès gratuit.
