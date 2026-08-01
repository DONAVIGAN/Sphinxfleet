-- ============================================================
-- SPHINXFLEET - Migration 004
-- Correctif : récursion infinie de auth_organisation_id() / auth_role()
-- ============================================================
--
-- Problème constaté en test :
--   auth_organisation_id() interroge la table `utilisateurs`, qui porte
--   elle-même une policy RLS (utilisateurs_isolation) filtrant sur
--   organisation_id = auth_organisation_id(). La policy rappelle donc la
--   fonction, qui relit `utilisateurs`, qui réapplique la policy… → boucle
--   infinie (erreur "infinite recursion detected in policy").
--
-- Correctif :
--   Passer ces fonctions utilitaires en `security definer`. Elles s'exécutent
--   alors avec les droits du propriétaire (postgres), qui contourne la RLS,
--   et lisent `utilisateurs` sans redéclencher la policy. C'est sûr ici car
--   la fonction ne renvoie qu'une donnée scalaire dérivée de auth.uid()
--   (l'organisation / le rôle de l'appelant), sans exposer d'autres lignes.
--
--   `set search_path = ''` : bonne pratique de sécurité pour une fonction
--   security definer (évite le détournement de résolution de noms). On
--   qualifie donc les tables en `public.`.
-- ============================================================

create or replace function auth_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organisation_id from public.utilisateurs where id = auth.uid()
$$;

create or replace function auth_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.utilisateurs where id = auth.uid()
$$;
