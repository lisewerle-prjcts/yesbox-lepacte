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
| `/inscription` | Création de compte |
| `/connexion` | Connexion |
| `/inviter-partenaire` | Créer un espace couple + lien d'invitation |
| `/rejoindre?token=...` | Rejoindre un couple via token |
| `/bienvenue` | Texte d'introduction, affiché une fois avant le tableau de bord |
| `/tableau-de-bord` | Dashboard — les 10 modules |
| `/module/[slug]` | Parcours questions d'un module |
| `/module/[slug]/revelation` | Révélation des réponses, score de connivence, historique |
| `/pacte` | Visualisation et signature du Pacte |
| `/mot-de-passe-oublie` | Réinitialisation mot de passe |

## Les 10 modules

1. 🪞 **Partenaire 1** — nommé au prénom du premier partenaire (module gratuit)
2. 👁️ **Partenaire 2** — nommé au prénom du second partenaire
3. 💑 **Notre couple**
4. 🏠 **Notre quotidien**
5. 🚀 **Nos projets**
6. 👪 **La famille**
7. 💬 **Nos modes de communication**
8. ⚡ **Nos disputes**
9. 📜 **Notre CDD de couple**
10. 🎓 **Le BAC love** — bilan annuel de couple, rejouable chaque année (score suivi dans le temps)

Les modules 1 et 2 portent le prénom réel de chaque partenaire (saisi à l'inscription).
Chaque module dispose d'un emplacement de texte d'introduction et de conclusion
(`introTexte` / `outroTexte` dans `src/lib/modules-data.ts`) à compléter.
Tout module scellé peut être rejoué via « Recommencer le module » : les réponses
précédentes sont conservées et consultables dans l'historique de la révélation.

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
```
