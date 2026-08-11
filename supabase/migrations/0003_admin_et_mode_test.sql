-- ============================================================
-- Migration 0003 — Accès admin auto pour lise.yesbox@gmail.com
-- + support du mode « voir/tester en tant que » (admin_view_as)
-- À exécuter dans le SQL Editor d'un projet Supabase déjà déployé.
-- ============================================================

-- L'inscription de ce compte (déjà faite ou à venir) devient automatiquement admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, new.email = 'lise.yesbox@gmail.com');
  return new;
end;
$$;

-- Si le compte existe déjà, on le passe admin rétroactivement.
update public.profiles set is_admin = true where email = 'lise.yesbox@gmail.com';
