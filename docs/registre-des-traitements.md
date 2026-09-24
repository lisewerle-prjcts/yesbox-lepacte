# Registre des activités de traitement — YES BOX · Le Pacte

Registre tenu au titre de l'article 30 du RGPD, sur la base du modèle proposé par la CNIL.
Document interne : à présenter à la CNIL sur demande, à mettre à jour à chaque nouveau traitement ou changement de prestataire.

**Dernière mise à jour :** septembre 2026

## Responsable du traitement

| | |
|---|---|
| Nom | Lise YESSOUROUR (YES BOX) |
| Adresse | 15 résidence des Charmilles, 78590 Noisy-le-Roi, France |
| Contact | lise.yesbox@gmail.com |
| Délégué à la protection des données (DPO) | Aucun (non obligatoire) |

## Sous-traitants (communs à plusieurs traitements)

| Prestataire | Rôle | Localisation | Garanties pour les transferts hors UE |
|---|---|---|---|
| Vercel Inc. | Hébergement du site | États-Unis | Clauses contractuelles types (CCT) / Data Privacy Framework |
| Supabase Inc. | Base de données, authentification | Singapour / États-Unis (selon la région du projet) | CCT (DPA Supabase) |
| Stripe Payments Europe, Ltd. | Paiement de l'abonnement | Irlande (UE), transferts possibles vers les États-Unis | CCT / Data Privacy Framework |
| Google LLC (Gmail) | Envoi des e-mails de service | États-Unis | CCT / Data Privacy Framework |
| Resend Inc. | Envoi des e-mails de service | États-Unis | CCT |

> À faire : accepter ou signer le contrat de sous-traitance (DPA) de chacun de ces prestataires et en garder une copie avec ce registre. Vérifier dans Supabase (Project Settings → General) la région où la base est hébergée.

---

## Fiche 1 — Gestion des comptes et fonctionnement du programme

| | |
|---|---|
| Date de création de la fiche | septembre 2026 |
| Finalité | Créer et gérer les comptes, associer les deux membres d'un couple, faire fonctionner les modules, les révélations, le journal et le pacte |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Personnes concernées | Utilisatrices et utilisateurs inscrits (15 ans ou plus) |
| Données | Prénom, nom (facultatif), e-mail, mot de passe (chiffré), nom et date du couple, code couple, code de parrainage, progression dans les modules |
| Données sensibles | Non (voir fiche 2) |
| Destinataires | Le ou la partenaire du couple (réponses des modules révélés, journal, pacte) ; l'administration du site (compte et progression, sans le contenu des réponses) ; sous-traitants Vercel et Supabase |
| Transferts hors UE | Oui : États-Unis, Singapour (voir tableau des sous-traitants) |
| Durée de conservation | Tant que le compte est utilisé. Compte jamais payé : suppression après 18 mois sans connexion. Après la fin d'un accès payé : clôture et effacement des réponses après 18 mois. Suppression immédiate sur demande (bouton « Supprimer mon compte ») |
| Mesures de sécurité | HTTPS, mots de passe chiffrés, isolement de chaque couple par des règles d'accès en base (Row Level Security), droits en écriture limités aux champs modifiables, limitation des tentatives de connexion, double authentification disponible pour l'administration, purge automatique quotidienne |

## Fiche 2 — Réponses aux modules (données sensibles)

| | |
|---|---|
| Date de création de la fiche | septembre 2026 |
| Finalité | Enregistrer les réponses, conclusions et le pacte du couple pour les leur restituer |
| Base légale | Consentement explicite (art. 9.2.a), recueilli à l'inscription par une case dédiée, horodaté (`profiles.consentement_donnees_sensibles_le`) |
| Personnes concernées | Membres des couples inscrits |
| Données | Réponses libres et à choix, conclusions, texte du pacte. Certaines questions portent sur la **vie intime** et les **convictions religieuses** (données sensibles, art. 9) |
| Destinataires | Uniquement les deux membres du couple (réponses du ou de la partenaire visibles après la révélation). L'administration n'a pas accès au contenu |
| Transferts hors UE | Oui : hébergement Supabase (voir tableau) |
| Durée de conservation | Identique à la fiche 1. Retrait du consentement : suppression du compte |
| Mesures de sécurité | Identiques à la fiche 1 ; aucun export ni affichage du contenu dans l'espace admin ; export réservé à la personne concernée (« Mes données ») |
| Analyse d'impact (AIPD) | Recommandée compte tenu des données sensibles — outil gratuit PIA de la CNIL |

## Fiche 3 — Abonnement, paiement et facturation

| | |
|---|---|
| Date de création de la fiche | septembre 2026 |
| Finalité | Gérer l'abonnement, les paiements, les codes gratuits et le parrainage, la facturation |
| Base légale | Exécution du contrat (art. 6.1.b) ; obligation légale de conservation comptable (art. 6.1.c) |
| Personnes concernées | Couples abonnés |
| Données | Statut et dates de l'abonnement, identifiants client et abonnement Stripe, codes gratuits utilisés, parrainages. Les données bancaires sont traitées par Stripe uniquement |
| Destinataires | Stripe ; administration du site |
| Transferts hors UE | Possibles via Stripe (voir tableau) |
| Durée de conservation | Données d'abonnement : comme la fiche 1. Factures : 10 ans (Code de commerce, art. L123-22) |
| Mesures de sécurité | Paiement hébergé par Stripe, webhooks signés, colonnes d'abonnement modifiables uniquement par le serveur |

## Fiche 4 — E-mails de service

| | |
|---|---|
| Date de création de la fiche | septembre 2026 |
| Finalité | Confirmation d'inscription, e-mail de bienvenue, réinitialisation du mot de passe, alertes de sécurité |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Personnes concernées | Utilisatrices et utilisateurs inscrits |
| Données | E-mail, prénom, code couple |
| Destinataires | Google (Gmail), Resend, Supabase (e-mails d'authentification) |
| Transferts hors UE | Oui : États-Unis (voir tableau) |
| Durée de conservation | Pas de stockage propre à l'application en dehors des boîtes d'envoi |
| Mesures de sécurité | Identifiants d'envoi stockés dans les variables d'environnement du serveur |

## Fiche 5 — Sécurité des connexions

| | |
|---|---|
| Date de création de la fiche | septembre 2026 |
| Finalité | Bloquer temporairement les tentatives de connexion répétées et les essais de codes couple |
| Base légale | Intérêt légitime (art. 6.1.f) : protéger le service et les comptes |
| Personnes concernées | Toute personne tentant de se connecter |
| Données | E-mail ou identifiant du compte, nombre d'essais, date de fin de blocage |
| Destinataires | Aucun en dehors du serveur |
| Transferts hors UE | Hébergement Supabase (voir tableau) |
| Durée de conservation | Effacement à la connexion réussie ; blocage de 15 minutes |
| Mesures de sécurité | Table accessible uniquement côté serveur |

## Fiche 6 — Pré-commandes (traitement terminé)

| | |
|---|---|
| Date de création de la fiche | septembre 2026 |
| Finalité | Recueillir les pré-commandes avant l'ouverture du programme (formulaire désormais retiré du site) |
| Base légale | Mesures précontractuelles (art. 6.1.b) |
| Personnes concernées | Personnes ayant pré-commandé |
| Données | Prénom, nom, e-mail, prénom du ou de la partenaire, ville, message |
| Destinataires | Administration du site ; Supabase |
| Transferts hors UE | Hébergement Supabase (voir tableau) |
| Durée de conservation | 18 mois après l'envoi, effacement automatique |
| Mesures de sécurité | Table accessible uniquement par l'administration |

---

## Violations de données

Toute violation de données personnelles (fuite, accès non autorisé, perte) doit être :
1. consignée ci-dessous (date, nature, données et personnes concernées, mesures prises) ;
2. notifiée à la CNIL sous 72 heures si elle présente un risque pour les personnes (notifications.cnil.fr) ;
3. communiquée aux personnes concernées si le risque est élevé.

| Date | Nature | Données / personnes concernées | Mesures prises | Notification CNIL |
|---|---|---|---|---|
| septembre 2026 | Faille de configuration corrigée (droits trop larges en base, cf. PR #30) | Aucune exploitation constatée à ce jour (comptes admin vérifiés) | Droits verrouillés (script SQL v14), vérification des comptes admin et des abonnements | Non requise en l'absence de violation constatée |
