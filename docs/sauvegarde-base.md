# Sauvegarde chiffrée de la base de données

Chaque nuit, GitHub fait une copie complète de la base Supabase : comptes de connexion, couples, réponses, pactes, réglages… La copie est chiffrée avec un mot de passe que seule l'équipe connaît, puis gardée 30 jours dans GitHub, onglet **Actions**. Elle s'efface ensuite toute seule.

Le code du site, lui, est déjà sauvegardé par GitHub (historique) et par Vercel (chaque mise en ligne, avec retour arrière en un clic).

Fichier de la tâche : `.github/workflows/sauvegarde-base.yml`.

---

## 1. Mise en place (une seule fois, 10 minutes)

### Étape 1 : choisir le mot de passe de chiffrement

- Crée un mot de passe long (au moins 20 caractères) dans ton gestionnaire de mots de passe (Bitwarden, 1Password…).
- Nomme l'entrée « YES BOX – mot de passe des sauvegardes ».
- **Sans ce mot de passe, les sauvegardes sont illisibles, pour toi aussi.** Ne le perds pas.

Range au même endroit :
- la valeur de `DONNEES_CLE_CHIFFREMENT` (Vercel > Settings > Environment Variables) : les réponses des couples sont chiffrées avec cette clé, une sauvegarde sans elle ne sert à rien ;
- tes codes de secours de double authentification.

### Étape 2 : récupérer l'adresse de la base dans Supabase

1. Ouvre ton projet sur supabase.com.
2. Clique sur le bouton **Connect**, en haut de la page.
3. Clique sur l'onglet **Direct** (« Connection string »), puis, dans la liste du type de connexion, choisis **Session pooler** (et non « Direct connection » : avec l'abonnement gratuit, GitHub ne peut pas utiliser la connexion directe).
4. Copie l'adresse. Elle ressemble à :
   `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`
5. Remplace `[YOUR-PASSWORD]` (crochets compris) par le mot de passe de la base.

Si tu ne connais plus ce mot de passe : Supabase > **Project Settings > Database > Reset database password**. Choisis-le **avec uniquement des lettres et des chiffres** : les caractères spéciaux (`@`, `#`, `/`…) cassent l'adresse. Le site n'utilise pas ce mot de passe, le changer ne le perturbe pas.

### Étape 3 : enregistrer les deux secrets dans GitHub

1. Va sur la page du dépôt `yesbox-lepacte` sur github.com.
2. **Settings** > **Secrets and variables** > **Actions** > bouton **New repository secret**.
3. Premier secret :
   - Name : `SUPABASE_DB_URL`
   - Secret : l'adresse de l'étape 2
4. Deuxième secret :
   - Name : `SAUVEGARDE_MOT_DE_PASSE`
   - Secret : le mot de passe de l'étape 1

GitHub ne réaffiche jamais un secret enregistré, même à toi : c'est normal.

### Étape 4 : lancer une première sauvegarde pour vérifier

1. Onglet **Actions** du dépôt > **Sauvegarde de la base** (colonne de gauche).
2. Bouton **Run workflow** > **Run workflow**.
3. Après 2 à 3 minutes, une coche verte apparaît. Clique dessus : en bas, sous **Artifacts**, tu vois `yesbox-base-AAAA-MM-JJ`.

Croix rouge ? Clique dessus pour voir l'étape en échec :
- « Secrets … manquants » : l'étape 3 n'est pas faite, ou un nom est mal écrit ;
- erreur de connexion ou « password authentication failed » : l'adresse de l'étape 2 est incorrecte (mot de passe, ou « Direct connection » au lieu de « Session pooler ») ;
- « Unexpected HTTP response: 504 » à l'étape « Installer l'outil Supabase » : panne passagère de GitHub, rien à corriger. La tâche réessaie seule (après 1 minute, puis 5 minutes) ; si la panne dure, relance-la plus tard avec **Run workflow**, ou attends la nuit suivante.

Ensuite, tout se fait seul chaque nuit. **Si une sauvegarde échoue, GitHub t'envoie un e-mail.**

> À noter : GitHub met en pause les tâches planifiées d'un dépôt sans aucune activité pendant 60 jours (il prévient par e-mail avant). Un clic sur « Enable workflow » dans l'onglet Actions les relance.

---

## 2. Vérifier de temps en temps (une fois par mois, 1 minute)

Onglet **Actions** > **Sauvegarde de la base** : la liste doit montrer une coche verte par nuit.

Une fois par trimestre, c'est une bonne idée de télécharger une sauvegarde et de vérifier qu'elle s'ouvre (partie 3, étapes 1 et 2).

---

## 3. Restaurer une sauvegarde (en cas de problème)

> Restaurer remplace des données : si possible, fais-toi accompagner (une session Claude Code peut le faire avec toi). En cas de piratage, change d'abord tous les mots de passe et clés (Supabase, Vercel, GitHub, Stripe).

### Étape 1 : télécharger l'archive

Onglet **Actions** > **Sauvegarde de la base** > la nuit voulue (avant le problème) > **Artifacts** > télécharger. GitHub donne un `.zip` qui contient `yesbox-base-AAAA-MM-JJ.tar.gz.gpg`.

### Étape 2 : la déchiffrer

Il faut l'outil gratuit GnuPG :
- Mac : installer « GPG Suite » (gpgtools.org), ou `brew install gnupg` ;
- Windows : installer « Gpg4win » (gpg4win.org).

Dans un terminal, dans le dossier du fichier :

```bash
gpg --decrypt yesbox-base-AAAA-MM-JJ.tar.gz.gpg | tar -xz
```

Le mot de passe des sauvegardes est demandé. Un dossier `sauvegarde` apparaît avec trois fichiers :
- `roles.sql` : les rôles de la base ;
- `schema.sql` : la structure (tables, règles d'accès, fonctions) ;
- `data.sql` : toutes les données, comptes de connexion compris.

Ces fichiers contiennent des données personnelles : supprime-les une fois la restauration terminée.

### Étape 3 : restaurer dans un nouveau projet Supabase

C'est la méthode officielle de Supabase, la plus sûre (le projet abîmé reste intact à côté) :

1. Crée un nouveau projet Supabase, dans la même région (**eu-west-1, Irlande**).
2. Récupère son adresse **Session pooler** (comme à l'étape 2 de la mise en place).
3. Installe `psql` (Mac : `brew install libpq` ; Windows : installeur PostgreSQL), puis lance :

```bash
psql --single-transaction --variable ON_ERROR_STOP=1 --file sauvegarde/roles.sql --file sauvegarde/schema.sql --command 'SET session_replication_role = replica' --file sauvegarde/data.sql --dbname "ADRESSE_DU_NOUVEAU_PROJET"
```

4. Dans Vercel > Settings > Environment Variables, remplace `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` par celles du nouveau projet (Supabase > Project Settings > API), puis redéploie.
5. Garde **la même** `DONNEES_CLE_CHIFFREMENT` : sinon les réponses restent illisibles.
6. Reprends dans le nouveau projet les réglages faits à la main dans le tableau de bord Supabase (Authentication > URL Configuration, modèles d'e-mails, fournisseur SMTP…).

Les comptes sont restaurés avec leurs mots de passe : personne n'a besoin de se réinscrire. Vérifie ensuite dans Admin > Sécurité que ta double authentification est toujours active, sinon réactive-la.
