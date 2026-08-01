-- ============================================================
-- SPHINXFLEET - Migration 003
-- Détection d'anomalies de consommation carburant
-- ============================================================

alter table vehicules
  add column consommation_theorique_l_100km numeric;

comment on column vehicules.consommation_theorique_l_100km is
  'Consommation de référence du véhicule (L/100km), utilisée pour détecter les écarts anormaux sur les missions.';
