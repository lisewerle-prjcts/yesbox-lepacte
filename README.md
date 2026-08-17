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
```
