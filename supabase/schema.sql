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
  pairing_code text unique default public.generate_pairing_code(), -- code à 6 caractères pour pairer le/la partenaire
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

-- Lien FK profiles.couple_id -> couples.id, ajouté ici (après la création de
-- la table couples) pour permettre l'embedding PostgREST `select('*, couples(*)')`.
alter table public.profiles add constraint profiles_couple_id_fkey
  foreign key (couple_id) references public.couples(id) on delete set null;

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
-- FONCTION : generate_precommande_code
-- Code aléatoire à 5 caractères (lettres majuscules + chiffres) attribué à
-- chaque nouvelle inscription pré-lancement, envoyé par email, et utilisé
-- par l'admin pour pairer manuellement deux inscrits en couple.
-- ============================================================
create or replace function public.generate_precommande_code()
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
    exit when not exists (select 1 from public.precommandes where couple_code = code);
  end loop;
  return code;
end;
$$;

-- ============================================================
-- precommandes
-- ============================================================
create table public.precommandes (
  id uuid primary key default uuid_generate_v4(),
  prenom text not null,
  nom text,
  email text not null unique,
  adresse text,
  message text,
  partenaire_prenom text,
  couple_code text unique default public.generate_precommande_code(),
  paired_with uuid references public.precommandes(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.precommandes enable row level security;
create policy "precommande_insert" on public.precommandes for insert with check (true);
create policy "precommande_admin_select" on public.precommandes for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "precommande_admin_update" on public.precommandes for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "precommande_admin_delete" on public.precommandes for delete using (
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
begin
  select * into v_couple
  from public.couples
  where invite_token = p_token
    and invite_used = false
    and invite_token_expires_at > now();

  if not found then
    return json_build_object('success', false, 'error', 'Token invalide ou expiré');
  end if;

  update public.profiles set couple_id = v_couple.id, role = 'partenaire' where id = p_user_id;
  update public.couples set invite_used = true where id = v_couple.id;
  perform public.initialiser_modules_couple(v_couple.id);

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

-- Nettoyage : colonne introduite en parallèle puis remplacée par partenaire_prenom
-- (voir plus bas) avant que le code ne l'utilise en production.
alter table public.precommandes drop column if exists partner_prenom;

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
-- MIGRATION — inscriptions pré-lancement enrichies (nom, binôme, code
-- couple à 5 caractères, appairage manuel par l'admin).
-- Idempotent : peut être relancé sans risque.
-- ============================================================
alter table public.precommandes add column if not exists nom text;
alter table public.precommandes add column if not exists partenaire_prenom text;
alter table public.precommandes add column if not exists couple_code text unique;
alter table public.precommandes add column if not exists paired_with uuid references public.precommandes(id) on delete set null;
alter table public.precommandes alter column couple_code set default public.generate_precommande_code();

do $$
declare
  p record;
begin
  for p in select id from public.precommandes where couple_code is null loop
    update public.precommandes set couple_code = public.generate_precommande_code() where id = p.id;
  end loop;
end;
$$;

drop policy if exists "precommande_admin_update" on public.precommandes;
create policy "precommande_admin_update" on public.precommandes for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
drop policy if exists "precommande_admin_delete" on public.precommandes;
create policy "precommande_admin_delete" on public.precommandes for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Lien FK profiles.couple_id -> couples.id (installations existantes créées
-- avant l'ajout de cette contrainte) : nécessaire pour l'embedding PostgREST
-- `select('*, couples(*)')` utilisé par la page /pacte.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'profiles_couple_id_fkey' and table_name = 'profiles'
  ) then
    alter table public.profiles add constraint profiles_couple_id_fkey
      foreign key (couple_id) references public.couples(id) on delete set null;
  end if;
end;
$$;
