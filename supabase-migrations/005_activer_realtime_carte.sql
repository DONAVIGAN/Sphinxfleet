-- ============================================================
-- SPHINXFLEET - Migration 005
-- Activation du temps réel pour la carte de la flotte
-- ============================================================
--
-- Problème constaté :
--   `src/pages/CarteFlotte.jsx` s'abonne aux INSERT sur `positions_vehicules` et
--   `alertes_sos` via `supabase.channel(...).on('postgres_changes', ...)`. Or aucune
--   table n'était ajoutée à la publication `supabase_realtime` : Postgres n'émettait
--   donc rien, et l'abonnement restait muet.
--
--   Conséquence : la carte affichait correctement l'état initial mais ne se mettait
--   JAMAIS à jour. Une alerte SOS n'apparaissait qu'après rechargement manuel de la
--   page — échec silencieux sur une fonction de sécurité.
--
-- Note de sécurité :
--   Le temps réel respecte les policies RLS existantes (`sos_select`,
--   `positions_select`) : un abonné ne reçoit que les lignes qu'il a le droit de lire.
--   Activer la publication n'élargit donc pas la visibilité entre organisations.
--
-- Note d'exploitation :
--   `add table` échoue si la table est déjà dans la publication. Le bloc conditionnel
--   rend la migration réexécutable sans erreur (utile car le realtime peut aussi avoir
--   été activé à la main depuis le dashboard Supabase).
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'positions_vehicules'
  ) then
    alter publication supabase_realtime add table public.positions_vehicules;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'alertes_sos'
  ) then
    alter publication supabase_realtime add table public.alertes_sos;
  end if;
end $$;
