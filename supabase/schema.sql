-- ============================================================
-- YES BOX — Le Pacte : Schéma Supabase
-- ============================================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE : profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  prenom text,
  avatar_url text,
  couple_id uuid,
  role text check (role in ('initiateur', 'partenaire')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Les utilisateurs voient leur propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Les utilisateurs modifient leur propre profil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Les utilisateurs voient le profil de leur partenaire"
  on public.profiles for select
  using (
    couple_id is not null and
    couple_id in (
      select couple_id from public.profiles where id = auth.uid()
    )
  );

-- ============================================================
-- TABLE : couples
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

create policy "Les membres du couple voient leur couple"
  on public.couples for select
  using (
    id in (
      select couple_id from public.profiles where id = auth.uid()
    )
  );

create policy "L'initiateur crée le couple"
  on public.couples for insert
  with check (true);

create policy "Les membres du couple modifient leur couple"
  on public.couples for update
  using (
    id in (
      select couple_id from public.profiles where id = auth.uid()
    )
  );

-- ============================================================
-- TABLE : modules
-- ============================================================
create table public.modules (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  slug text not null check (slug in (
    'valeurs', 'communication', 'intimite', 'finances',
    'projets', 'famille', 'croissance'
  )),
  statut text default 'locked' check (statut in ('locked', 'en_cours', 'complete')),
  score_partenaire1 integer,
  score_partenaire2 integer,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(couple_id, slug)
);

alter table public.modules enable row level security;

create policy "Les membres du couple voient leurs modules"
  on public.modules for select
  using (
    couple_id in (
      select couple_id from public.profiles where id = auth.uid()
    )
  );

create policy "Les membres du couple modifient leurs modules"
  on public.modules for update
  using (
    couple_id in (
      select couple_id from public.profiles where id = auth.uid()
    )
  );

create policy "Les membres du couple créent leurs modules"
  on public.modules for insert
  with check (
    couple_id in (
      select couple_id from public.profiles where id = auth.uid()
    )
  );

-- ============================================================
-- TABLE : reponses
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

create policy "Les utilisateurs voient leurs propres réponses"
  on public.reponses for select
  using (auth.uid() = user_id);

create policy "Les utilisateurs voient les réponses de leur partenaire (même module)"
  on public.reponses for select
  using (
    module_id in (
      select m.id from public.modules m
      join public.profiles p on p.couple_id = m.couple_id
      where p.id = auth.uid()
    )
  );

create policy "Les utilisateurs créent leurs propres réponses"
  on public.reponses for insert
  with check (auth.uid() = user_id);

create policy "Les utilisateurs modifient leurs propres réponses"
  on public.reponses for update
  using (auth.uid() = user_id);

-- ============================================================
-- TABLE : pacte_items
-- ============================================================
create table public.pacte_items (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  module_slug text not null,
  contenu text not null,
  signe_partenaire1 boolean default false,
  signe_partenaire2 boolean default false,
  created_at timestamptz default now()
);

alter table public.pacte_items enable row level security;

create policy "Les membres du couple voient leurs items de pacte"
  on public.pacte_items for select
  using (
    couple_id in (
      select couple_id from public.profiles where id = auth.uid()
    )
  );

create policy "Les membres du couple créent leurs items de pacte"
  on public.pacte_items for insert
  with check (
    couple_id in (
      select couple_id from public.profiles where id = auth.uid()
    )
  );

create policy "Les membres du couple modifient leurs items de pacte"
  on public.pacte_items for update
  using (
    couple_id in (
      select couple_id from public.profiles where id = auth.uid()
    )
  );

-- ============================================================
-- TABLE : notifications
-- ============================================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  message text not null,
  lu boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Les utilisateurs voient leurs notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Les utilisateurs modifient leurs notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ============================================================
-- FONCTION : handle_new_user
-- Crée automatiquement un profil à l'inscription
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FONCTION : initialiser_modules_couple
-- Crée les 7 modules lors de la création d'un couple
-- ============================================================
create or replace function public.initialiser_modules_couple(p_couple_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  slugs text[] := array['valeurs', 'communication', 'intimite', 'finances', 'projets', 'famille', 'croissance'];
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
returns json
language plpgsql
security definer
as $$
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

  update public.profiles
  set couple_id = v_couple.id, role = 'partenaire'
  where id = p_user_id;

  update public.couples
  set invite_used = true
  where id = v_couple.id;

  perform public.initialiser_modules_couple(v_couple.id);

  return json_build_object('success', true, 'couple_id', v_couple.id);
end;
$$;

-- ============================================================
-- MISE À JOUR (v2) — colonnes supplémentaires
-- ============================================================

-- Colonnes révélation sur modules
alter table public.modules add column if not exists revealed boolean default false;
alter table public.modules add column if not exists connivence_score integer;
alter table public.modules add column if not exists revealed_at timestamptz;

-- Table pré-commandes
create table if not exists public.precommandes (
  id uuid primary key default uuid_generate_v4(),
  prenom text not null,
  email text not null,
  adresse text,
  message text,
  created_at timestamptz default now()
);
alter table public.precommandes enable row level security;
create policy if not exists "Tout le monde peut pré-commander"
  on public.precommandes for insert with check (true);

-- Table journal
create table if not exists public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  module_slug text not null,
  contenu text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(couple_id, module_slug)
);
alter table public.journal_entries enable row level security;
create policy if not exists "Membres du couple voient leur journal"
  on public.journal_entries for select using (
    couple_id in (select couple_id from public.profiles where id = auth.uid())
  );
create policy if not exists "Membres du couple créent leur journal"
  on public.journal_entries for insert with check (
    couple_id in (select couple_id from public.profiles where id = auth.uid())
  );
create policy if not exists "Membres du couple modifient leur journal"
  on public.journal_entries for update using (
    couple_id in (select couple_id from public.profiles where id = auth.uid())
  );
