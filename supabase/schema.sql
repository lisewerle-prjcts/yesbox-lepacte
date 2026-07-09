-- ============================================================
-- YES BOX — Le Pacte : Schéma complet (v4)
-- À exécuter dans un nouveau projet Supabase.
-- Pour un projet déjà déployé, appliquer plutôt dans l'ordre :
-- supabase/migrations/0002_dix_modules.sql puis 0003_admin_et_mode_test.sql
-- ============================================================

create extension if not exists "uuid-ossp";

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
  intro_vue boolean not null default false,
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
  nom_couple text,
  date_anniversaire date,
  invite_token uuid unique default uuid_generate_v4(),
  invite_token_expires_at timestamptz default (now() + interval '7 days'),
  invite_used boolean default false,
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
    'partenaire1', 'partenaire2', 'couple', 'quotidien', 'projets', 'famille',
    'communication', 'disputes', 'cdd', 'bac'
  )),
  -- Un cycle = un passage complet dans le module. RECOMMENCER LE MODULE crée un
  -- nouveau cycle (nouvelle ligne) sans effacer les cycles précédents ; le module 10
  -- (BAC love) s'appuie sur ce même mécanisme pour son bilan rejoué chaque année.
  cycle integer not null default 1,
  statut text default 'locked' check (statut in ('locked', 'en_cours', 'complete')),
  revealed boolean default false,
  completed_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz default now(),
  unique(couple_id, slug, cycle)
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
-- scores (score de connivence, 1 à 5 étoiles, indépendant par personne)
-- ============================================================
create table public.scores (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(module_id, user_id)
);
alter table public.scores enable row level security;

create policy "score_select" on public.scores for select using (
  module_id in (
    select m.id from public.modules m
    join public.profiles p on p.couple_id = m.couple_id
    where p.id = auth.uid()
  )
);
create policy "score_insert" on public.scores for insert with check (auth.uid() = user_id);
create policy "score_update" on public.scores for update using (auth.uid() = user_id);

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
  email text not null unique,
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
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, new.email = 'lise.yesbox@gmail.com');
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
  slugs text[] := array['partenaire1','partenaire2','couple','quotidien','projets','famille','communication','disputes','cdd','bac'];
  s text;
  i integer := 0;
begin
  foreach s in array slugs loop
    insert into public.modules (couple_id, slug, statut)
    values (p_couple_id, s, case when i = 0 then 'en_cours' else 'locked' end)
    on conflict (couple_id, slug, cycle) do nothing;
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
