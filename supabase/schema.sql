-- ============================================================
-- YES BOX — Le Pacte : Schéma complet (v3)
-- À exécuter dans un nouveau projet Supabase
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- FONCTION : generate_pairing_code
-- Code aléatoire à 6 caractères (lettres majuscules + chiffres) utilisé
-- par le 1er membre d'un couple pour que son/sa partenaire le/la rejoigne.
-- ============================================================
create or replace function public.generate_pairing_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'; -- sans I/O pour éviter la confusion avec 1/0
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.couples where pairing_code = code);
  end loop;
  return code;
end;
$$;

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  prenom text,
  avatar_url text,
  couple_id uuid,
  role text check (role in ('initiateur', 'partenaire')),
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "profil_own_select" on public.profiles for select using (auth.uid() = id);
create policy "profil_own_update" on public.profiles for update using (auth.uid() = id);
create policy "profil_partner_select" on public.profiles for select using (
  couple_id is not null and
  couple_id in (select couple_id from public.profiles where id = auth.uid())
);
create policy "profil_insert" on public.profiles for insert with check (auth.uid() = id);

-- ============================================================
-- couples
-- ============================================================
create table public.couples (
  id uuid primary key default uuid_generate_v4(),
  numero integer generated always as identity, -- numérotation "Couple 1, 2, ..." réservée à l'admin
  nom_couple text,
  date_anniversaire date,
  invite_token uuid unique default uuid_generate_v4(),
  invite_token_expires_at timestamptz default (now() + interval '7 days'),
  invite_used boolean default false,
  pairing_code text unique default public.generate_pairing_code(), -- code à 5 caractères pour pairer le/la partenaire
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.couples enable row level security;

create policy "couple_member_select" on public.couples for select using (
  id in (select couple_id from public.profiles where id = auth.uid())
);
create policy "couple_insert" on public.couples for insert with check (true);
create policy "couple_member_update" on public.couples for update using (
  id in (select couple_id from public.profiles where id = auth.uid())
);

-- ============================================================
-- modules
-- ============================================================
create table public.modules (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  slug text not null check (slug in (
    'moi', 'toi', 'nous', 'communication', 'conflits', 'engagement', 'renouvellement'
  )),
  statut text default 'locked' check (statut in ('locked', 'en_cours', 'complete')),
  revealed boolean default false,
  connivence_score integer,
  completed_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz default now(),
  unique(couple_id, slug)
);
alter table public.modules enable row level security;

create policy "module_select" on public.modules for select using (
  couple_id in (select couple_id from public.profiles where id = auth.uid())
);
create policy "module_insert" on public.modules for insert with check (
  couple_id in (select couple_id from public.profiles where id = auth.uid())
);
create policy "module_update" on public.modules for update using (
  couple_id in (select couple_id from public.profiles where id = auth.uid())
);

-- ============================================================
-- reponses
-- ============================================================
create table public.reponses (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_slug text not null,
  valeur text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(module_id, user_id, question_slug)
);
alter table public.reponses enable row level security;

create policy "reponse_own_select" on public.reponses for select using (auth.uid() = user_id);
create policy "reponse_partner_select" on public.reponses for select using (
  module_id in (
    select m.id from public.modules m
    join public.profiles p on p.couple_id = m.couple_id
    where p.id = auth.uid()
  )
);
create policy "reponse_insert" on public.reponses for insert with check (auth.uid() = user_id);
create policy "reponse_update" on public.reponses for update using (auth.uid() = user_id);

-- ============================================================
-- journal_entries
-- ============================================================
create table public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  module_slug text not null,
  contenu text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(couple_id, module_slug)
);
alter table public.journal_entries enable row level security;

create policy "journal_select" on public.journal_entries for select using (
  couple_id in (select couple_id from public.profiles where id = auth.uid())
);
create policy "journal_insert" on public.journal_entries for insert with check (
  couple_id in (select couple_id from public.profiles where id = auth.uid())
);
create policy "journal_update" on public.journal_entries for update using (
  couple_id in (select couple_id from public.profiles where id = auth.uid())
);

-- ============================================================
-- precommandes
-- ============================================================
create table public.precommandes (
  id uuid primary key default uuid_generate_v4(),
  prenom text not null,
  nom text,
  email text not null unique,
  partner_prenom text,
  adresse text,
  message text,
  created_at timestamptz default now()
);
alter table public.precommandes enable row level security;
create policy "precommande_insert" on public.precommandes for insert with check (true);
create policy "precommande_admin_select" on public.precommandes for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- ============================================================
-- settings (messages configurables admin)
-- Clés préfixées utilisées par convention :
--   module_questions_override::<slug>  → contenu des modules (admin/contenu)
--   site_content::<clé>                → textes & boutons édités en mode édition (site + espaces couples)
-- ============================================================
create table public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table public.settings enable row level security;
create policy "settings_admin" on public.settings using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- ============================================================
-- FONCTION : handle_new_user
-- Les adresses listées dans admin_emails deviennent admin dès l'inscription.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin_emails text[] := array['lise.werle@gmail.com', 'lise.yesbox@gmail.com'];
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, lower(new.email) = any(admin_emails));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FONCTION : initialiser_modules_couple
-- ============================================================
create or replace function public.initialiser_modules_couple(p_couple_id uuid)
returns void language plpgsql security definer as $$
declare
  slugs text[] := array['moi','toi','nous','communication','conflits','engagement','renouvellement'];
  s text;
  i integer := 0;
begin
  foreach s in array slugs loop
    insert into public.modules (couple_id, slug, statut)
    values (p_couple_id, s, case when i = 0 then 'en_cours' else 'locked' end)
    on conflict (couple_id, slug) do nothing;
    i := i + 1;
  end loop;
end;
$$;

-- ============================================================
-- FONCTION : rejoindre_couple_via_token
-- ============================================================
create or replace function public.rejoindre_couple_via_token(p_token uuid, p_user_id uuid)
returns json language plpgsql security definer as $$
declare
  v_couple public.couples;
  v_previous_couple_id uuid;
begin
  select * into v_couple
  from public.couples
  where invite_token = p_token
    and invite_used = false
    and invite_token_expires_at > now();

  if not found then
    return json_build_object('success', false, 'error', 'Token invalide ou expiré');
  end if;

  select couple_id into v_previous_couple_id from public.profiles where id = p_user_id;

  update public.profiles set couple_id = v_couple.id, role = 'partenaire' where id = p_user_id;
  update public.couples set invite_used = true where id = v_couple.id;
  perform public.initialiser_modules_couple(v_couple.id);

  if v_previous_couple_id is not null and v_previous_couple_id is distinct from v_couple.id then
    perform public.migrer_abonnement_solo_vers_couple(v_previous_couple_id, v_couple.id);
  end if;

  return json_build_object('success', true, 'couple_id', v_couple.id);
end;
$$;

-- ============================================================
-- FONCTION : rejoindre_couple_via_code
-- Pairing par code à 6 caractères : le 2ᵉ membre saisit le code obtenu
-- par le 1er membre à la création de son profil (immédiatement à
-- l'inscription, ou plus tard depuis son espace s'il/elle a créé son
-- profil sans indiquer de code).
-- ============================================================
create or replace function public.rejoindre_couple_via_code(p_code text, p_user_id uuid)
returns json language plpgsql security definer as $$
declare
  v_couple public.couples;
  v_member_count integer;
  v_previous_couple_id uuid;
  v_previous_member_count integer;
begin
  select * into v_couple
  from public.couples
  where pairing_code = upper(trim(p_code));

  if not found then
    return json_build_object('success', false, 'error', 'Code invalide');
  end if;

  select count(*) into v_member_count from public.profiles where couple_id = v_couple.id;
  if v_member_count >= 2 then
    return json_build_object('success', false, 'error', 'Ce couple a déjà deux membres');
  end if;

  select couple_id into v_previous_couple_id from public.profiles where id = p_user_id;

  if v_previous_couple_id = v_couple.id then
    return json_build_object('success', false, 'error', 'Tu fais déjà partie de ce couple');
  end if;

  update public.profiles
  set couple_id = v_couple.id, role = case when v_member_count = 0 then 'initiateur' else 'partenaire' end
  where id = p_user_id;

  perform public.initialiser_modules_couple(v_couple.id);

  -- Nettoie l'espace solo précédent si celui-ci devient vide (profil créé sans code, code ajouté plus tard)
  if v_previous_couple_id is not null and v_previous_couple_id is distinct from v_couple.id then
    perform public.migrer_abonnement_solo_vers_couple(v_previous_couple_id, v_couple.id);
    select count(*) into v_previous_member_count from public.profiles where couple_id = v_previous_couple_id;
    if v_previous_member_count = 0 then
      delete from public.couples where id = v_previous_couple_id;
    end if;
  end if;

  return json_build_object('success', true, 'couple_id', v_couple.id);
end;
$$;

-- ============================================================
-- MIGRATION — à exécuter tel quel sur un projet Supabase existant
-- (déjà initialisé avec une version antérieure de ce schéma).
-- Idempotent : peut être relancé sans risque.
-- ============================================================
alter table public.couples add column if not exists numero integer generated always as identity;
alter table public.couples add column if not exists pairing_code text unique;
alter table public.couples alter column pairing_code set default public.generate_pairing_code();

alter table public.precommandes add column if not exists nom text;
alter table public.precommandes add column if not exists partner_prenom text;

alter table public.profiles add column if not exists nom text;

do $$
declare
  c record;
begin
  for c in select id from public.couples where pairing_code is null loop
    update public.couples set pairing_code = public.generate_pairing_code() where id = c.id;
  end loop;
end;
$$;

-- Accès admin complet pour les comptes déjà inscrits avec ces adresses
-- (les nouvelles inscriptions avec ces adresses deviennent admin automatiquement, cf. handle_new_user)
update public.profiles set is_admin = true
where lower(email) in ('lise.werle@gmail.com', 'lise.yesbox@gmail.com');

-- ============================================================
-- SÉCURITÉ ADMIN (v4) : historique des connexions, rate limiting,
-- codes de secours 2FA. À exécuter une fois sur un projet existant.
-- ============================================================

-- Historique des sessions actives du compte connecté (lecture seule, colonnes non sensibles).
-- security definer : nécessaire pour lire auth.sessions, mais restreint à auth.uid() du côté where.
create or replace function public.admin_list_own_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_agent text,
  ip text,
  is_current boolean
)
language sql security definer set search_path = public, auth as $$
  select s.id, s.created_at, s.updated_at, s.user_agent, s.ip::text,
         s.id = (nullif(auth.jwt() ->> 'session_id', ''))::uuid as is_current
  from auth.sessions s
  where s.user_id = auth.uid()
  order by s.updated_at desc;
$$;
grant execute on function public.admin_list_own_sessions() to authenticated;

-- Rate limiting sur la page de connexion. Verrouillé aux clients (RLS activée,
-- aucune policy) : uniquement lisible/modifiable via le service role côté serveur.
create table if not exists public.login_attempts (
  email text primary key,
  attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.login_attempts enable row level security;

-- Codes de secours 2FA à usage unique. Seuls les hashs sont stockés ; jamais
-- exposés au client sauf au moment de la génération. Verrouillé aux clients
-- (RLS activée, aucune policy) : uniquement accessible via le service role.
create table if not exists public.mfa_recovery_codes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.mfa_recovery_codes enable row level security;
create index if not exists mfa_recovery_codes_user_id_idx on public.mfa_recovery_codes(user_id);

-- ============================================================
-- COMPTE UTILISATEUR & PACTE PARTAGÉ (v5)
-- Nom de famille, document de pacte partagé, code de pairage à 5
-- caractères (créé dès l'inscription). À exécuter une fois.
-- ============================================================

alter table public.profiles add column if not exists nom text;

alter table public.couples add column if not exists pacte_texte text;
alter table public.couples add column if not exists pacte_modifie_par uuid references public.profiles(id);
alter table public.couples add column if not exists pacte_modifie_le timestamptz;

-- Le code de pairage passe de 6 à 5 caractères (le couple est désormais
-- créé dès l'inscription, avant même que le/la partenaire n'ait de nom
-- de couple ou de date à renseigner).
create or replace function public.generate_pairing_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'; -- sans I/O pour éviter la confusion avec 1/0
  code text;
begin
  loop
    code := '';
    for i in 1..5 loop
      code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.couples where pairing_code = code);
  end loop;
  return code;
end;
$$;

-- ============================================================
-- CORRECTIONS ADMIN (v6)
-- Modules verrouillés par défaut, numéros de couple réaffectés
-- après suppression. À exécuter une fois.
-- ============================================================

-- Tous les modules démarrent verrouillés — l'admin les débloque
-- manuellement depuis Actions manuelles (avant le 1er septembre, plus
-- aucun module ne se débloque automatiquement à la création du couple).
create or replace function public.initialiser_modules_couple(p_couple_id uuid)
returns void language plpgsql security definer as $$
declare
  slugs text[] := array['moi','toi','nous','communication','conflits','engagement','renouvellement'];
  s text;
begin
  foreach s in array slugs loop
    insert into public.modules (couple_id, slug, statut)
    values (p_couple_id, s, 'locked')
    on conflict (couple_id, slug) do nothing;
  end loop;
end;
$$;

-- Le numéro de couple n'est plus une identity auto-incrémentée (qui ne
-- réutilise jamais les numéros supprimés) : c'est désormais une colonne
-- normale, réaffectée par renumeroter_couples() à chaque création ou
-- suppression, pour que la numérotation reste toujours 1..N sans trou.
alter table public.couples alter column numero drop identity if exists;

create or replace function public.renumeroter_couples()
returns void language plpgsql security definer as $$
begin
  with ordered as (
    select id, row_number() over (order by created_at) as rn
    from public.couples
  )
  update public.couples c set numero = o.rn
  from ordered o
  where c.id = o.id;
end;
$$;

select public.renumeroter_couples();

-- ============================================================
-- CORRECTIF (v7)
-- profiles.couple_id n'avait jamais de vraie clé étrangère vers
-- couples : PostgREST ne peut pas résoudre les jointures imbriquées
-- `couples(...)` utilisées sur Mon compte, Notre Pacte et la page
-- Utilisateurs (elles échouent silencieusement et renvoient vide).
-- À exécuter une fois.
-- ============================================================
alter table public.profiles
  add constraint profiles_couple_id_fkey foreign key (couple_id) references public.couples(id) on delete set null;

-- ============================================================
-- CORRECTIF (v8)
-- Le v6 a retiré l'auto-génération de couples.numero (drop identity)
-- mais la colonne est restée NOT NULL sans valeur par défaut : toute
-- création de couple échouait donc à l'insertion (avant même que
-- renumeroter_couples() puisse s'exécuter). C'était la vraie cause du
-- comptage incohérent et de "Ajouter un couple" qui ne faisait rien.
-- À exécuter une fois.
-- ============================================================
alter table public.couples alter column numero drop not null;

-- ============================================================
-- MODULES PERSONNALISÉS (v9)
-- Permet à l'admin de créer de nouveaux modules (en plus des 7
-- fixes) depuis Admin > Contenu. Les questions d'un module
-- personnalisé passent par le même mécanisme de "questions
-- ajoutées" déjà utilisé pour les modules existants
-- (module_questions_override::<slug> dans settings) — pas besoin
-- de stocker les questions ici, seulement les métadonnées du module.
-- À exécuter une fois.
-- ============================================================
create table public.module_definitions (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  ordre numeric not null,
  titre text not null,
  sous_titre text,
  description text,
  emoji text default '✦',
  gratuit boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.module_definitions enable row level security;
-- Aucune policy : accessible uniquement via le service role côté serveur
-- (lecture faite dans getEffectiveModules() avec le client admin, comme
-- pour les overrides de questions dans settings).

-- Le slug n'est plus limité aux 7 valeurs fixes.
alter table public.modules drop constraint if exists modules_slug_check;

-- initialiser_modules_couple boucle désormais aussi sur les modules
-- personnalisés pour semer une ligne verrouillée par couple.
create or replace function public.initialiser_modules_couple(p_couple_id uuid)
returns void language plpgsql security definer as $$
declare
  slugs text[] := array['moi','toi','nous','communication','conflits','engagement','renouvellement'];
  s text;
  r record;
begin
  foreach s in array slugs loop
    insert into public.modules (couple_id, slug, statut)
    values (p_couple_id, s, 'locked')
    on conflict (couple_id, slug) do nothing;
  end loop;

  for r in select slug from public.module_definitions loop
    insert into public.modules (couple_id, slug, statut)
    values (p_couple_id, r.slug, 'locked')
    on conflict (couple_id, slug) do nothing;
  end loop;
end;
$$;

-- Ajoute rétroactivement une ligne verrouillée pour un nouveau module
-- personnalisé, chez tous les couples déjà inscrits.
create or replace function public.backfill_module_pour_tous_les_couples(p_slug text)
returns void language plpgsql security definer as $$
begin
  insert into public.modules (couple_id, slug, statut)
  select id, p_slug, 'locked' from public.couples
  on conflict (couple_id, slug) do nothing;
end;
$$;

-- ============================================================
-- REFONTE DES MODULES & CONCLUSIONS INDIVIDUELLES (v10)
-- Les 7 modules à questions à choix/échelle deviennent 10 modules à
-- questions ouvertes (moi/toi -> toi ; nouveaux : quotidien, projets,
-- famille, intimite). Le score de connivence (étoiles) disparaît :
-- chaque module se termine par une conclusion en 2 questions
-- ("qu'as-tu appris ?" / "qu'est-ce qui t'a surpris ?") que chacun
-- écrit de son côté ; le module se scelle et débloque le suivant une
-- fois que les DEUX partenaires ont écrit la leur.
-- journal_entries passe d'un document partagé unique par module à une
-- ligne par personne et par question de conclusion (même forme que
-- reponses). À exécuter une fois.
-- ============================================================

alter table public.modules drop column if exists connivence_score;

alter table public.modules drop constraint if exists modules_slug_check;

alter table public.journal_entries drop constraint if exists journal_entries_couple_id_module_slug_key;
alter table public.journal_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.journal_entries add column if not exists question_slug text not null default 'apprentissage';
alter table public.journal_entries rename column contenu to valeur;
alter table public.journal_entries alter column valeur drop not null;
alter table public.journal_entries alter column valeur drop default;

-- Toute entrée partagée créée sous l'ancien système n'a pas d'auteur
-- identifiable : elle est supprimée plutôt que rattachée à tort à
-- l'un des deux partenaires.
delete from public.journal_entries where user_id is null;
alter table public.journal_entries alter column user_id set not null;

alter table public.journal_entries add constraint journal_entries_couple_module_user_question_key
  unique (couple_id, module_slug, user_id, question_slug);

drop policy if exists "journal_insert" on public.journal_entries;
drop policy if exists "journal_update" on public.journal_entries;
create policy "journal_insert" on public.journal_entries for insert with check (
  auth.uid() = user_id
  and couple_id in (select couple_id from public.profiles where id = auth.uid())
);
create policy "journal_update" on public.journal_entries for update using (
  auth.uid() = user_id
  and couple_id in (select couple_id from public.profiles where id = auth.uid())
);

-- Les 10 modules fixes actuels (remplace l'ancienne liste à 7).
create or replace function public.initialiser_modules_couple(p_couple_id uuid)
returns void language plpgsql security definer as $$
declare
  slugs text[] := array['toi','nous','quotidien','projets','famille','communication','intimite','conflits','engagement','renouvellement'];
  s text;
  r record;
begin
  foreach s in array slugs loop
    insert into public.modules (couple_id, slug, statut)
    values (p_couple_id, s, 'locked')
    on conflict (couple_id, slug) do nothing;
  end loop;

  for r in select slug from public.module_definitions loop
    insert into public.modules (couple_id, slug, statut)
    values (p_couple_id, r.slug, 'locked')
    on conflict (couple_id, slug) do nothing;
  end loop;
end;
$$;

-- ============================================================
-- ABONNEMENT STRIPE (v11)
-- Abonnement mensuel géré via Stripe (checkout + webhooks). Le
-- statut du couple conditionne l'accès aux modules payants
-- au-delà du module 1 (gratuit) et est affiché/annulable depuis
-- Mon compte. Source de vérité : Stripe, répliqué ici par le
-- webhook (src/app/api/webhooks/stripe/route.ts) via le service
-- role uniquement — d'où le retrait des droits de modification de
-- ces colonnes aux utilisateurs authentifiés (colonnes à écriture
-- serveur seule, même si la ligne leur est accessible en update
-- pour nom_couple/date_anniversaire/pacte_texte).
--
-- Rétention : à la fin de l'accès payé (résiliation ou échéance
-- non renouvelée), les données sont conservées 13 mois
-- (data_retention_until). Passé ce délai, la tâche planifiée
-- /api/cron/purger-comptes-expires clôture définitivement le
-- compte (compte_resilie_le) et efface les réponses et le
-- journal : l'abonnement ne peut plus être réactivé sur ce
-- couple, il faut recommencer avec un nouveau compte.
-- À exécuter une fois.
-- ============================================================
alter table public.couples add column if not exists stripe_customer_id text;
alter table public.couples add column if not exists stripe_subscription_id text;
alter table public.couples add column if not exists subscription_status text
  check (subscription_status in ('aucun', 'actif', 'incomplet', 'expire', 'resilie'))
  not null default 'aucun';
alter table public.couples add column if not exists subscription_current_period_end timestamptz;
alter table public.couples add column if not exists subscription_cancel_at_period_end boolean not null default false;
alter table public.couples add column if not exists subscription_canceled_at timestamptz;
alter table public.couples add column if not exists data_retention_until timestamptz;
alter table public.couples add column if not exists compte_resilie_le timestamptz;

create unique index if not exists couples_stripe_customer_id_idx on public.couples(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists couples_stripe_subscription_id_idx on public.couples(stripe_subscription_id) where stripe_subscription_id is not null;

-- Un membre du couple peut modifier nom_couple/date_anniversaire/pacte_texte
-- (cf. policy "couple_member_update") mais jamais les colonnes d'abonnement :
-- seul le service role (webhook Stripe, actions serveur admin) le peut.
revoke update (
  stripe_customer_id, stripe_subscription_id, subscription_status,
  subscription_current_period_end, subscription_cancel_at_period_end,
  subscription_canceled_at, data_retention_until, compte_resilie_le
) on public.couples from authenticated;

-- Idempotence des webhooks Stripe : chaque event.id n'est traité qu'une fois.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- Aucune policy : accessible uniquement via le service role côté serveur (webhook).

-- ============================================================
-- CODES GRATUITS & PARRAINAGE (v12)
-- Deux façons d'obtenir un accès sans payer, indépendantes de Stripe :
--   1. Un code gratuit distribué à la main (ex. aux testeurs) depuis
--      Admin > Codes gratuits, saisi par le couple sur /abonnement.
--   2. Le parrainage : chaque couple a un code à partager ; au 5e couple
--      parrainé qui s'inscrit, 1 mois est offert automatiquement.
-- Les deux se traduisent par une extension de couples.acces_gratuit_expire_le
-- (ou, si le couple paie déjà activement, par un crédit sur son compte
-- client Stripe — cf. src/lib/parrainage.ts) : accès considéré actif tant
-- que cette date n'est pas dépassée (cf. estAbonnementActif). Comme pour
-- les colonnes d'abonnement (v11), ces colonnes ne sont modifiables que
-- par le service role. À exécuter une fois.
-- ============================================================

alter table public.couples add column if not exists acces_gratuit_expire_le timestamptz;
revoke update (acces_gratuit_expire_le) on public.couples from authenticated;

create table if not exists public.codes_gratuits (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  duree_mois integer, -- null = accès illimité tant que le code n'est pas désactivé
  usages_max integer not null default 1,
  usages integer not null default 0,
  actif boolean not null default true,
  note text,
  created_at timestamptz default now()
);
alter table public.codes_gratuits enable row level security;
-- Aucune policy : gestion et lecture réservées au service role (admin + action de rédemption).

create table if not exists public.codes_gratuits_utilisations (
  id uuid primary key default uuid_generate_v4(),
  code_id uuid not null references public.codes_gratuits(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade unique, -- un seul code gratuit par couple
  utilise_le timestamptz not null default now()
);
alter table public.codes_gratuits_utilisations enable row level security;

-- Rédemption atomique (verrou sur la ligne du code pour éviter qu'un même
-- code dépasse usages_max sous concurrence). Appelée avec le service role
-- depuis src/app/actions/abonnement.ts (utiliserCodeGratuit).
create or replace function public.utiliser_code_gratuit(p_code text, p_couple_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_code public.codes_gratuits;
  v_expire timestamptz;
begin
  select * into v_code from public.codes_gratuits
  where code = upper(trim(p_code)) and actif = true
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'invalide');
  end if;
  if v_code.usages >= v_code.usages_max then
    return json_build_object('success', false, 'error', 'epuise');
  end if;
  if exists (select 1 from public.codes_gratuits_utilisations where couple_id = p_couple_id) then
    return json_build_object('success', false, 'error', 'deja_utilise');
  end if;

  update public.codes_gratuits set usages = usages + 1 where id = v_code.id;
  insert into public.codes_gratuits_utilisations (code_id, couple_id) values (v_code.id, p_couple_id);

  v_expire := case
    when v_code.duree_mois is null then timestamptz '2999-01-01'
    else now() + (v_code.duree_mois || ' months')::interval
  end;
  update public.couples set acces_gratuit_expire_le = v_expire where id = p_couple_id;

  return json_build_object('success', true, 'expire_le', v_expire);
end;
$$;

alter table public.couples add column if not exists code_parrainage text unique;
alter table public.couples add column if not exists parrain_couple_id uuid references public.couples(id) on delete set null;
alter table public.couples add column if not exists parrainages_recompenses integer not null default 0;
revoke update (code_parrainage, parrain_couple_id, parrainages_recompenses) on public.couples from authenticated;

create or replace function public.generate_code_parrainage()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'; -- sans I/O pour éviter la confusion avec 1/0
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.couples where code_parrainage = code);
  end loop;
  return code;
end;
$$;

alter table public.couples alter column code_parrainage set default public.generate_code_parrainage();

do $$
declare
  c record;
begin
  for c in select id from public.couples where code_parrainage is null loop
    update public.couples set code_parrainage = public.generate_code_parrainage() where id = c.id;
  end loop;
end;
$$;

-- Rattache un couple qui vient de s'inscrire à son parrain, et calcule
-- atomiquement (verrou sur la ligne du parrain) le nombre de nouveaux
-- mois à offrir dès qu'un palier de 5 filleuls est atteint. L'octroi
-- effectif (crédit Stripe si le parrain paie déjà, sinon extension de
-- acces_gratuit_expire_le) est fait côté application — cf.
-- src/lib/parrainage.ts — car il peut nécessiter un appel à l'API Stripe.
create or replace function public.parrainer_couple(p_code_parrainage text, p_nouveau_couple_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_parrain public.couples;
  v_total integer;
  v_nouveaux_blocs integer;
begin
  select * into v_parrain from public.couples
  where code_parrainage = upper(trim(p_code_parrainage))
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'invalide');
  end if;
  if v_parrain.id = p_nouveau_couple_id then
    return json_build_object('success', false, 'error', 'auto_parrainage');
  end if;

  update public.couples set parrain_couple_id = v_parrain.id where id = p_nouveau_couple_id;

  select count(*) into v_total from public.couples where parrain_couple_id = v_parrain.id;
  v_nouveaux_blocs := greatest((v_total / 5) - v_parrain.parrainages_recompenses, 0);

  if v_nouveaux_blocs > 0 then
    update public.couples set parrainages_recompenses = v_parrain.parrainages_recompenses + v_nouveaux_blocs where id = v_parrain.id;
  end if;

  return json_build_object(
    'success', true,
    'parrain_couple_id', v_parrain.id,
    'total_parraines', v_total,
    'nouveaux_mois_offerts', v_nouveaux_blocs
  );
end;
$$;

-- ============================================================
-- MIGRATION D'ABONNEMENT AU PAIRAGE (v13)
-- Correctif : un couple qui a souscrit en solo (avant de pairer avec son
-- ou sa partenaire), puis rejoint le couple de l'autre via code ou lien
-- d'invitation, voyait son ancien espace solo — et l'abonnement Stripe
-- qui lui était rattaché — supprimé ou abandonné sans que rien ne soit
-- transféré : l'abonnement continuait à être prélevé côté Stripe mais
-- devenait invisible et inutilisable côté app. migrer_abonnement_solo_vers_couple
-- transfère l'abonnement (ou l'accès gratuit) de l'ancien couple vers le
-- nouveau avant que rejoindre_couple_via_code/rejoindre_couple_via_token
-- ne l'abandonnent. Ne transfère jamais par-dessus un abonnement déjà actif
-- sur le couple rejoint. À exécuter une fois.
-- ============================================================
create or replace function public.migrer_abonnement_solo_vers_couple(p_ancien_couple_id uuid, p_nouveau_couple_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ancien public.couples;
  v_nouveau public.couples;
begin
  if p_ancien_couple_id is null or p_ancien_couple_id = p_nouveau_couple_id then
    return;
  end if;

  select * into v_ancien from public.couples where id = p_ancien_couple_id;
  select * into v_nouveau from public.couples where id = p_nouveau_couple_id;
  if v_ancien.id is null or v_nouveau.id is null then
    return;
  end if;

  if v_ancien.stripe_subscription_id is not null and v_nouveau.stripe_subscription_id is null then
    update public.couples set
      stripe_customer_id = v_ancien.stripe_customer_id,
      stripe_subscription_id = v_ancien.stripe_subscription_id,
      subscription_status = v_ancien.subscription_status,
      subscription_current_period_end = v_ancien.subscription_current_period_end,
      subscription_cancel_at_period_end = v_ancien.subscription_cancel_at_period_end,
      subscription_canceled_at = v_ancien.subscription_canceled_at,
      data_retention_until = v_ancien.data_retention_until
    where id = p_nouveau_couple_id;
  end if;

  if v_ancien.acces_gratuit_expire_le is not null
     and (v_nouveau.acces_gratuit_expire_le is null or v_ancien.acces_gratuit_expire_le > v_nouveau.acces_gratuit_expire_le) then
    update public.couples set acces_gratuit_expire_le = v_ancien.acces_gratuit_expire_le where id = p_nouveau_couple_id;
  end if;
end;
$$;

-- Réappliquées ici pour prendre effet sur un projet déjà migré (v3/v9) :
-- identiques aux définitions plus haut dans ce fichier, avec l'appel à
-- migrer_abonnement_solo_vers_couple ajouté.
create or replace function public.rejoindre_couple_via_token(p_token uuid, p_user_id uuid)
returns json language plpgsql security definer as $$
declare
  v_couple public.couples;
  v_previous_couple_id uuid;
begin
  select * into v_couple
  from public.couples
  where invite_token = p_token
    and invite_used = false
    and invite_token_expires_at > now();

  if not found then
    return json_build_object('success', false, 'error', 'Token invalide ou expiré');
  end if;

  select couple_id into v_previous_couple_id from public.profiles where id = p_user_id;

  update public.profiles set couple_id = v_couple.id, role = 'partenaire' where id = p_user_id;
  update public.couples set invite_used = true where id = v_couple.id;
  perform public.initialiser_modules_couple(v_couple.id);

  if v_previous_couple_id is not null and v_previous_couple_id is distinct from v_couple.id then
    perform public.migrer_abonnement_solo_vers_couple(v_previous_couple_id, v_couple.id);
  end if;

  return json_build_object('success', true, 'couple_id', v_couple.id);
end;
$$;

create or replace function public.rejoindre_couple_via_code(p_code text, p_user_id uuid)
returns json language plpgsql security definer as $$
declare
  v_couple public.couples;
  v_member_count integer;
  v_previous_couple_id uuid;
  v_previous_member_count integer;
begin
  select * into v_couple
  from public.couples
  where pairing_code = upper(trim(p_code));

  if not found then
    return json_build_object('success', false, 'error', 'Code invalide');
  end if;

  select count(*) into v_member_count from public.profiles where couple_id = v_couple.id;
  if v_member_count >= 2 then
    return json_build_object('success', false, 'error', 'Ce couple a déjà deux membres');
  end if;

  select couple_id into v_previous_couple_id from public.profiles where id = p_user_id;

  if v_previous_couple_id = v_couple.id then
    return json_build_object('success', false, 'error', 'Tu fais déjà partie de ce couple');
  end if;

  update public.profiles
  set couple_id = v_couple.id, role = case when v_member_count = 0 then 'initiateur' else 'partenaire' end
  where id = p_user_id;

  perform public.initialiser_modules_couple(v_couple.id);

  if v_previous_couple_id is not null and v_previous_couple_id is distinct from v_couple.id then
    perform public.migrer_abonnement_solo_vers_couple(v_previous_couple_id, v_couple.id);
    select count(*) into v_previous_member_count from public.profiles where couple_id = v_previous_couple_id;
    if v_previous_member_count = 0 then
      delete from public.couples where id = v_previous_couple_id;
    end if;
  end if;

  return json_build_object('success', true, 'couple_id', v_couple.id);
end;
$$;

-- ============================================================
-- SÉCURITÉ : VERROUILLAGE DES DROITS (v14)
-- Correctifs de failles :
--   1. La policy "profil_own_update" laissait chaque compte modifier
--      toutes les colonnes de son profil, y compris is_admin (accès à
--      tout l'espace admin) et couple_id (accès aux réponses d'un autre
--      couple).
--   2. Les "revoke update (colonnes)" des v11/v12 étaient sans effet :
--      dans PostgreSQL, retirer un droit colonne par colonne ne change
--      rien tant que le rôle garde le droit UPDATE sur toute la table
--      (accordé par défaut par Supabase). Un couple pouvait donc se
--      passer lui-même en abonnement actif ou en accès gratuit illimité,
--      ou créer un couple déjà "actif" (policy "couple_insert" ouverte).
--   3. Les fonctions security definer (pairage, codes gratuits,
--      parrainage, migration d'abonnement…) pouvaient être appelées
--      directement par n'importe qui via l'API Supabase, avec des
--      identifiants choisis librement.
-- Désormais, les comptes connectés ne peuvent modifier que les champs
-- éditables depuis l'app ; tout le reste passe par le service role côté
-- serveur (actions serveur, webhook Stripe). À exécuter une fois.
-- ============================================================

-- profiles : seuls prénom, nom et avatar sont modifiables par la personne elle-même.
-- (Les profils sont créés par le trigger handle_new_user, jamais par l'app.)
drop policy if exists "profil_insert" on public.profiles;
revoke insert, update on public.profiles from anon, authenticated;
grant update (prenom, nom, avatar_url, updated_at) on public.profiles to authenticated;

-- couples : création réservée au serveur ; les membres ne modifient que
-- le nom, la date d'anniversaire et le texte du pacte.
drop policy if exists "couple_insert" on public.couples;
revoke insert, update on public.couples from anon, authenticated;
grant update (nom_couple, date_anniversaire, pacte_texte, pacte_modifie_par, pacte_modifie_le, updated_at)
  on public.couples to authenticated;

-- Fonctions sensibles : exécutables uniquement par le service role.
revoke execute on function public.rejoindre_couple_via_token(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.rejoindre_couple_via_code(text, uuid) from public, anon, authenticated;
revoke execute on function public.utiliser_code_gratuit(text, uuid) from public, anon, authenticated;
revoke execute on function public.parrainer_couple(text, uuid) from public, anon, authenticated;
revoke execute on function public.migrer_abonnement_solo_vers_couple(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.initialiser_modules_couple(uuid) from public, anon, authenticated;
revoke execute on function public.renumeroter_couples() from public, anon, authenticated;
revoke execute on function public.backfill_module_pour_tous_les_couples(text) from public, anon, authenticated;

grant execute on function public.rejoindre_couple_via_token(uuid, uuid) to service_role;
grant execute on function public.rejoindre_couple_via_code(text, uuid) to service_role;
grant execute on function public.utiliser_code_gratuit(text, uuid) to service_role;
grant execute on function public.parrainer_couple(text, uuid) to service_role;
grant execute on function public.migrer_abonnement_solo_vers_couple(uuid, uuid) to service_role;
grant execute on function public.initialiser_modules_couple(uuid) to service_role;
grant execute on function public.renumeroter_couples() to service_role;
grant execute on function public.backfill_module_pour_tous_les_couples(text) to service_role;

-- Vérification après exécution : seules les adresses admin attendues
-- doivent apparaître. Si une autre adresse est listée, la faille a pu
-- être exploitée : repasse-la à false et vérifie les actions admin récentes.
--   select email from public.profiles where is_admin = true;

-- ============================================================
-- RGPD : CONSENTEMENT ET CONSERVATION 18 MOIS (v15)
-- 1. Preuve du consentement à l'inscription (RGPD art. 7 et 9) :
--    certification d'avoir 15 ans ou plus et consentement explicite au
--    traitement des données sensibles (vie intime, convictions
--    religieuses), horodatés. Colonnes renseignées côté serveur uniquement
--    (non modifiables par les comptes, cf. v14).
-- 2. Conservation portée de 13 à 18 mois : les couples déjà en période de
--    conservation (accès payé terminé, compte pas encore clos) gagnent les
--    5 mois supplémentaires.
-- À exécuter une fois.
-- ============================================================
alter table public.profiles add column if not exists age_minimum_certifie_le timestamptz;
alter table public.profiles add column if not exists consentement_donnees_sensibles_le timestamptz;

update public.couples
set data_retention_until = data_retention_until + interval '5 months'
where data_retention_until is not null
  and compte_resilie_le is null;

-- ============================================================
-- SÉCURITÉ : RÈGLES DU JEU VERROUILLÉES EN BASE (v16)
-- En deux parties, dans cet ordre :
--   A. AVANT de déployer le code correspondant (nouvelles colonnes).
--   B. APRÈS le déploiement (verrouillage : l'ancien code écrivait
--      directement dans les modules et ne fonctionnerait plus).
-- ============================================================

-- ---------- Partie A ----------
-- Réponses partagées : passe à true quand les deux membres ont répondu à
-- toutes les questions (posé par le serveur, cf. src/lib/progression.ts).
alter table public.modules add column if not exists reponses_partagees boolean not null default false;
update public.modules set reponses_partagees = true where revealed;

-- E-mail de bienvenue envoyé une seule fois, après confirmation de
-- l'adresse. Les comptes existants sont considérés comme déjà servis.
alter table public.profiles add column if not exists email_bienvenue_envoye_le timestamptz;
update public.profiles set email_bienvenue_envoye_le = now() where email_bienvenue_envoye_le is null;

-- ---------- Partie B ----------
-- Pré-commandes : formulaire retiré, plus aucune insertion depuis l'API.
drop policy if exists "precommande_insert" on public.precommandes;
revoke insert on public.precommandes from anon, authenticated;

-- Modules : statut, révélation et déblocage ne sont plus modifiables que
-- par le serveur (fin du contournement du déroulé).
drop policy if exists "module_insert" on public.modules;
drop policy if exists "module_update" on public.modules;
revoke insert, update, delete on public.modules from anon, authenticated;

-- Réponses : celles de l'autre ne sont lisibles qu'une fois partagées ;
-- on ne peut écrire que dans un module ouvert de son propre couple, et
-- plus du tout une fois les réponses partagées.
drop policy if exists "reponse_partner_select" on public.reponses;
create policy "reponse_partner_select" on public.reponses for select using (
  module_id in (
    select m.id from public.modules m
    join public.profiles p on p.couple_id = m.couple_id
    where p.id = auth.uid() and (m.reponses_partagees or m.revealed)
  )
);
drop policy if exists "reponse_insert" on public.reponses;
create policy "reponse_insert" on public.reponses for insert with check (
  auth.uid() = user_id
  and module_id in (
    select m.id from public.modules m
    join public.profiles p on p.couple_id = m.couple_id
    where p.id = auth.uid() and m.statut <> 'locked' and not m.reponses_partagees and not m.revealed
  )
);
drop policy if exists "reponse_update" on public.reponses;
create policy "reponse_update" on public.reponses for update using (
  auth.uid() = user_id
  and module_id in (
    select m.id from public.modules m
    join public.profiles p on p.couple_id = m.couple_id
    where p.id = auth.uid() and m.statut <> 'locked' and not m.reponses_partagees and not m.revealed
  )
) with check (
  auth.uid() = user_id
  and module_id in (
    select m.id from public.modules m
    join public.profiles p on p.couple_id = m.couple_id
    where p.id = auth.uid() and m.statut <> 'locked' and not m.reponses_partagees and not m.revealed
  )
);

-- Conclusions : chacun·e écrit la sienne une fois les réponses partagées,
-- et celle de l'autre n'est lisible qu'après la révélation.
drop policy if exists "journal_select" on public.journal_entries;
create policy "journal_select" on public.journal_entries for select using (
  couple_id in (select couple_id from public.profiles where id = auth.uid())
  and (
    user_id = auth.uid()
    or exists (
      select 1 from public.modules m
      where m.couple_id = journal_entries.couple_id and m.slug = journal_entries.module_slug and m.revealed
    )
  )
);
drop policy if exists "journal_insert" on public.journal_entries;
create policy "journal_insert" on public.journal_entries for insert with check (
  auth.uid() = user_id
  and couple_id in (select couple_id from public.profiles where id = auth.uid())
  and exists (
    select 1 from public.modules m
    where m.couple_id = journal_entries.couple_id and m.slug = journal_entries.module_slug
      and m.reponses_partagees and not m.revealed
  )
);
drop policy if exists "journal_update" on public.journal_entries;
create policy "journal_update" on public.journal_entries for update using (
  auth.uid() = user_id
  and couple_id in (select couple_id from public.profiles where id = auth.uid())
  and exists (
    select 1 from public.modules m
    where m.couple_id = journal_entries.couple_id and m.slug = journal_entries.module_slug and not m.revealed
  )
) with check (
  auth.uid() = user_id
  and couple_id in (select couple_id from public.profiles where id = auth.uid())
  and exists (
    select 1 from public.modules m
    where m.couple_id = journal_entries.couple_id and m.slug = journal_entries.module_slug
      and m.reponses_partagees and not m.revealed
  )
);
