-- ============================================================
-- SPHINXFLEET - Migration 006
-- Webhook SOS : alertes_sos (INSERT) -> fonction serverless Vercel
-- ============================================================
--
-- Équivalent SQL du "Database Webhook" du dashboard Supabase (qui se trouve
-- désormais sous Integrations > Database Webhooks, plus sous Database).
-- Un webhook Supabase n'est rien d'autre qu'un trigger appelant
-- `supabase_functions.http_request`, lui-même basé sur `pg_net` (asynchrone :
-- l'INSERT n'attend pas la réponse HTTP).
--
-- Fait en SQL plutôt qu'à la main dans l'UI pour que la configuration soit
-- versionnée avec le code et reproductible sur un autre environnement.
--
-- ⚠️ SECRET — À LIRE AVANT D'EXÉCUTER
--   Ce fichier contient le placeholder `__SOS_WEBHOOK_SECRET__`, PAS le vrai
--   secret : la valeur réelle ne doit jamais être committée.
--   Remplacer le placeholder par la valeur de `SOS_WEBHOOK_SECRET`
--   (variable d'environnement du projet Vercel `sphinxfleet`) au moment de
--   l'exécution dans le SQL Editor, sans enregistrer le fichier modifié.
--
--   Conséquence à connaître : le secret devient lisible dans la définition du
--   trigger (`pg_get_triggerdef`, `\d+ alertes_sos`) par tout rôle ayant accès
--   au schéma. C'est le même compromis que le webhook créé via l'UI, qui stocke
--   ses headers en base. Le secret ne protège que contre l'appel direct de
--   l'endpoint Vercel par un tiers, pas contre quelqu'un qui a déjà la main sur
--   la base. En cas de rotation : régénérer côté Vercel PUIS rejouer ce script.
--
-- Prérequis : extension `pg_net` activée (Database > Extensions). Les projets
-- Supabase récents l'ont par défaut ; le bloc ci-dessous échoue explicitement
-- si le schéma `supabase_functions` est absent.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'supabase_functions') then
    raise exception
      'Schéma supabase_functions absent : activer l''extension pg_net (Database > Extensions) avant de rejouer cette migration.';
  end if;
end $$;

-- Idempotence : permet de rejouer la migration (ex. rotation du secret) sans
-- se retrouver avec deux triggers qui appelleraient l'endpoint en double.
drop trigger if exists sos_alert_vers_vercel on public.alertes_sos;

create trigger sos_alert_vers_vercel
  after insert on public.alertes_sos
  for each row
  execute function supabase_functions.http_request(
    'https://sphinxfleet.vercel.app/api/sos-alert',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"__SOS_WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );

-- Note : `after insert` uniquement, volontairement.
-- Un trigger sur UPDATE rejouerait l'alerte à chaque changement de statut
-- (y compris le passage à 'resolue'), et donc renotifierait les secours.
--
-- Le payload envoyé par http_request contient `record` (la nouvelle ligne) et
-- `old_record`, ce qui correspond à ce que lit `api/sos-alert.js` (`body.record`).

comment on trigger sos_alert_vers_vercel on public.alertes_sos is
  'Notifie la fonction Vercel /api/sos-alert à chaque nouvelle alerte SOS. Secret partagé dans le header x-webhook-secret (voir SOS_WEBHOOK_SECRET côté Vercel).';
