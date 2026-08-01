-- ============================================================
-- SPHINXFLEET - Migration 002
-- Allocation des coûts de réparation par projet (module ONG)
-- ============================================================

alter table pannes_reparations
  add column projet_id uuid references projets(id);

create index idx_pannes_projet on pannes_reparations(projet_id);

-- Autorise l'affectation d'une panne à un projet par les rôles habilités
-- (la policy pannes_update existante couvre déjà cette colonne, rien à changer côté RLS)
