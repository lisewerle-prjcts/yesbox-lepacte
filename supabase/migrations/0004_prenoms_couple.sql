-- ============================================================
-- Migration 0004 — Prénoms des deux partenaires portés par le couple
-- À exécuter dans le SQL Editor d'un projet Supabase déjà déployé.
--
-- Jusqu'ici, le nom des modules 1 et 2 dépendait entièrement de ce que
-- chaque compte avait renseigné comme prénom (profiles.prenom) croisé
-- avec son rôle (initiateur/partenaire). Résultat : impossible de nommer
-- les modules tant que les deux comptes n'existent pas, et impossible
-- pour l'admin de les configurer à l'avance.
--
-- On ajoute donc deux colonnes sur `couples`, qui deviennent la source de
-- vérité pour le nom des modules 1 et 2, synchronisées automatiquement
-- quand un membre renseigne son propre prénom, mais éditables directement
-- par l'admin (même avant qu'un des deux comptes existe).
-- ============================================================

alter table public.couples add column if not exists prenom_partenaire1 text;
alter table public.couples add column if not exists prenom_partenaire2 text;
