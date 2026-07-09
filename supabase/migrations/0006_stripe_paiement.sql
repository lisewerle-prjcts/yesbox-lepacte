-- Paiement Stripe : le module 1 est jouable gratuitement, mais la révélation
-- (et donc l'accès aux modules suivants) est réservée aux couples ayant payé
-- l'accès complet (paiement unique, 89€).
alter table public.couples
  add column if not exists a_paye boolean not null default false,
  add column if not exists paye_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_checkout_session_id text;
