-- ============================================================
-- Migration 0005 — Contenu éditable en direct (mode édition admin)
-- À exécuter dans le SQL Editor d'un projet Supabase déjà déployé.
--
-- Chaque texte de l'appli a une clé stable et un texte par défaut codé en
-- dur. Cette table ne stocke que les textes que l'admin a explicitement
-- réécrits ; tout le reste continue d'afficher le texte par défaut.
-- Lecture publique (le contenu doit s'afficher pour tout le monde),
-- écriture réservée aux comptes is_admin.
-- ============================================================

create table if not exists public.content_overrides (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table public.content_overrides enable row level security;

drop policy if exists "content_public_select" on public.content_overrides;
drop policy if exists "content_admin_insert" on public.content_overrides;
drop policy if exists "content_admin_update" on public.content_overrides;
drop policy if exists "content_admin_delete" on public.content_overrides;

create policy "content_public_select" on public.content_overrides for select using (true);
create policy "content_admin_insert" on public.content_overrides for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "content_admin_update" on public.content_overrides for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "content_admin_delete" on public.content_overrides for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
