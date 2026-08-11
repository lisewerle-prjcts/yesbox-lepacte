-- ============================================================
-- Migration 0002 — Passage à 10 modules (schéma v3 → v4)
-- À exécuter dans le SQL Editor d'un projet Supabase déjà déployé
-- avec supabase/schema.sql (v3). Pour un tout nouveau projet,
-- exécuter directement supabase/schema.sql (déjà à jour).
--
-- ATTENTION : la structure des modules change intégralement (nouveaux
-- slugs, nouvelles questions, score de connivence désormais noté
-- indépendamment par chaque partenaire). Cette migration repart de
-- zéro sur les données de progression (modules, réponses, score,
-- journal) — les comptes et couples existants sont conservés.
-- ============================================================

-- profils : indicateur "a lu le texte d'introduction de l'app"
alter table public.profiles add column if not exists intro_vue boolean not null default false;

-- on efface la progression liée à l'ancienne structure de modules
truncate table public.journal_entries;
truncate table public.reponses, public.modules cascade;

-- modules : cycles (pour RECOMMENCER LE MODULE et le BAC love annuel)
alter table public.modules add column if not exists cycle integer not null default 1;

alter table public.modules drop constraint if exists modules_slug_check;
alter table public.modules add constraint modules_slug_check check (slug in (
  'partenaire1', 'partenaire2', 'couple', 'quotidien', 'projets', 'famille',
  'communication', 'disputes', 'cdd', 'bac'
));

alter table public.modules drop constraint if exists modules_couple_id_slug_key;
alter table public.modules drop constraint if exists modules_couple_id_slug_cycle_key;
alter table public.modules add constraint modules_couple_id_slug_cycle_key unique (couple_id, slug, cycle);

alter table public.modules drop column if exists connivence_score;

-- ============================================================
-- scores (score de connivence, 1 à 5 étoiles, indépendant par personne)
-- ============================================================
create table if not exists public.scores (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(module_id, user_id)
);
alter table public.scores enable row level security;

drop policy if exists "score_select" on public.scores;
drop policy if exists "score_insert" on public.scores;
drop policy if exists "score_update" on public.scores;

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
-- FONCTION : initialiser_modules_couple (nouveaux slugs)
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

-- Recrée les 10 modules pour tous les couples existants
do $$
declare c record;
begin
  for c in select id from public.couples loop
    perform public.initialiser_modules_couple(c.id);
  end loop;
end $$;
