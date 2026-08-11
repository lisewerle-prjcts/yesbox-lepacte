-- Nom de famille (en plus du prénom déjà existant), demandé à l'inscription.
alter table public.profiles
  add column if not exists nom text;

-- Passage de l'accès complet en abonnement mensuel (29€/mois) plutôt qu'un
-- paiement unique : on garde couples.a_paye comme indicateur d'accès actif
-- (mis à jour par le webhook Stripe à chaque évènement d'abonnement), et on
-- ajoute l'identifiant de l'abonnement Stripe pour pouvoir le gérer.
alter table public.couples
  add column if not exists stripe_subscription_id text,
  add column if not exists abonnement_statut text;

-- Fige, pour chaque réponse déjà enregistrée, le texte exact de la question
-- tel qu'affiché au moment de la réponse — pour que l'admin puisse modifier
-- les questions sans changer rétroactivement ce que les couples ont déjà lu
-- et auquel ils ont déjà répondu (seul un "recommencer le module" repart du
-- texte à jour).
alter table public.reponses
  add column if not exists question_texte text;
