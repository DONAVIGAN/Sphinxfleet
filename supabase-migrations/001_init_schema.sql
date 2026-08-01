-- ============================================================
-- SPHINXFLEET - Migration initiale
-- Schéma + RLS (Row Level Security)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. ORGANISATIONS (multi-tenant)
-- ============================================================
create table organisations (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  type text not null check (type in ('entreprise', 'ong')),
  pays text not null check (pays in ('Niger', 'Benin')),
  created_at timestamptz default now()
);

-- ============================================================
-- 2. SITES (antennes, pour ONG multi-bases)
-- ============================================================
create table sites (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  nom text not null,
  ville text,
  created_at timestamptz default now()
);

-- ============================================================
-- 3. UTILISATEURS (rôles applicatifs, liés à auth.users)
-- ============================================================
create table utilisateurs (
  id uuid primary key references auth.users(id) on delete cascade,
  organisation_id uuid not null references organisations(id) on delete cascade,
  site_id uuid references sites(id),
  role text not null check (role in ('super_admin', 'admin_flotte', 'superviseur', 'chauffeur', 'bailleur', 'mecanicien')),
  nom text not null,
  telephone text,
  created_at timestamptz default now()
);

-- ============================================================
-- 4. VÉHICULES
-- ============================================================
create table vehicules (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  site_id uuid references sites(id),
  immatriculation text not null,
  marque text not null,
  modele text not null,
  annee int,
  type_carburant text not null check (type_carburant in ('essence', 'diesel', 'electrique')),
  kilometrage_actuel int default 0,
  statut text not null default 'actif' check (statut in ('actif', 'en_panne', 'hors_service')),
  date_acquisition date,
  valeur_acquisition numeric,
  vin text,
  photo_url text,
  created_at timestamptz default now(),
  unique(organisation_id, immatriculation)
);

-- ============================================================
-- 5. DOCUMENTS VÉHICULE (assurance, visite technique, etc.)
-- ============================================================
create table documents_vehicule (
  id uuid primary key default uuid_generate_v4(),
  vehicule_id uuid not null references vehicules(id) on delete cascade,
  type_document text not null check (type_document in ('assurance', 'visite_technique', 'vignette', 'carte_grise')),
  date_expiration date not null,
  fichier_url text,
  statut_alerte text default 'ok' check (statut_alerte in ('ok', 'alerte', 'expire')),
  created_at timestamptz default now()
);

-- ============================================================
-- 6. CHAUFFEURS
-- ============================================================
create table chauffeurs (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  utilisateur_id uuid references utilisateurs(id),
  nom text not null,
  telephone text,
  numero_permis text,
  date_expiration_permis date,
  vehicule_assigne_id uuid references vehicules(id),
  created_at timestamptz default now()
);

-- ============================================================
-- 7. PROJETS (module ONG - allocation coûts par bailleur)
-- ============================================================
create table projets (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  nom text not null,
  bailleur text,
  budget_vehicule numeric,
  date_debut date,
  date_fin date,
  created_at timestamptz default now()
);

-- ============================================================
-- 8. MISSIONS
-- ============================================================
create table missions (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  vehicule_id uuid not null references vehicules(id),
  chauffeur_id uuid not null references chauffeurs(id),
  projet_id uuid references projets(id),
  date_debut timestamptz not null default now(),
  date_fin timestamptz,
  origine text,
  destination text,
  objectif text,
  km_depart int not null,
  km_arrivee int,
  carburant_consomme_litres numeric,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'terminee')),
  created_at timestamptz default now()
);

-- ============================================================
-- 9. PANNES & RÉPARATIONS
-- ============================================================
create table pannes_reparations (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  vehicule_id uuid not null references vehicules(id),
  date_panne date not null default current_date,
  description text not null,
  garage text,
  pieces_changees text,
  cout numeric,
  statut text not null default 'signalee' check (statut in ('signalee', 'en_reparation', 'resolue')),
  declare_par uuid references utilisateurs(id),
  created_at timestamptz default now()
);

-- ============================================================
-- 10. POSITIONS GPS (agnostique de la source)
-- ============================================================
create table positions_vehicules (
  id uuid primary key default uuid_generate_v4(),
  vehicule_id uuid not null references vehicules(id) on delete cascade,
  mission_id uuid references missions(id),
  latitude numeric not null,
  longitude numeric not null,
  source text not null default 'smartphone' check (source in ('smartphone', 'boitier_gps')),
  timestamp timestamptz default now()
);

create index idx_positions_vehicule_timestamp on positions_vehicules(vehicule_id, timestamp desc);

-- ============================================================
-- 11. ALERTES SOS
-- ============================================================
create table alertes_sos (
  id uuid primary key default uuid_generate_v4(),
  vehicule_id uuid not null references vehicules(id),
  chauffeur_id uuid not null references chauffeurs(id),
  mission_id uuid references missions(id),
  latitude numeric not null,
  longitude numeric not null,
  statut text not null default 'declenchee' check (statut in ('declenchee', 'en_cours', 'resolue')),
  created_at timestamptz default now(),
  resolue_at timestamptz
);

-- ============================================================
-- INDEX UTILES
-- ============================================================
create index idx_vehicules_org on vehicules(organisation_id);
create index idx_missions_org on missions(organisation_id);
create index idx_missions_vehicule on missions(vehicule_id);
create index idx_missions_chauffeur on missions(chauffeur_id);
create index idx_pannes_vehicule on pannes_reparations(vehicule_id);
create index idx_documents_expiration on documents_vehicule(date_expiration);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Fonction utilitaire : récupère l'organisation_id de l'utilisateur connecté
create or replace function auth_organisation_id()
returns uuid
language sql stable
as $$
  select organisation_id from utilisateurs where id = auth.uid()
$$;

-- Fonction utilitaire : récupère le rôle de l'utilisateur connecté
create or replace function auth_role()
returns text
language sql stable
as $$
  select role from utilisateurs where id = auth.uid()
$$;

-- Activation RLS sur toutes les tables métier
alter table organisations enable row level security;
alter table sites enable row level security;
alter table utilisateurs enable row level security;
alter table vehicules enable row level security;
alter table documents_vehicule enable row level security;
alter table chauffeurs enable row level security;
alter table projets enable row level security;
alter table missions enable row level security;
alter table pannes_reparations enable row level security;
alter table positions_vehicules enable row level security;
alter table alertes_sos enable row level security;

-- --- ORGANISATIONS : visible uniquement par ses membres ---
create policy org_isolation on organisations
  for select using (id = auth_organisation_id());

-- --- UTILISATEURS : isolation par organisation ---
create policy utilisateurs_isolation on utilisateurs
  for select using (organisation_id = auth_organisation_id());

-- --- SITES : isolation par organisation ---
create policy sites_isolation on sites
  for all using (organisation_id = auth_organisation_id());

-- --- VÉHICULES : isolation par organisation, écriture restreinte ---
create policy vehicules_select on vehicules
  for select using (organisation_id = auth_organisation_id());

create policy vehicules_write on vehicules
  for all using (
    organisation_id = auth_organisation_id()
    and auth_role() in ('super_admin', 'admin_flotte', 'superviseur')
  );

-- --- DOCUMENTS VÉHICULE : suit la visibilité du véhicule parent ---
create policy documents_vehicule_isolation on documents_vehicule
  for all using (
    vehicule_id in (select id from vehicules where organisation_id = auth_organisation_id())
  );

-- --- CHAUFFEURS : isolation organisation, chauffeur voit sa propre fiche ---
create policy chauffeurs_select on chauffeurs
  for select using (
    organisation_id = auth_organisation_id()
    and (
      auth_role() in ('super_admin', 'admin_flotte', 'superviseur')
      or utilisateur_id = auth.uid()
    )
  );

create policy chauffeurs_write on chauffeurs
  for all using (
    organisation_id = auth_organisation_id()
    and auth_role() in ('super_admin', 'admin_flotte', 'superviseur')
  );

-- --- PROJETS : isolation organisation, bailleur voit uniquement son projet ---
create policy projets_select on projets
  for select using (organisation_id = auth_organisation_id());

create policy projets_write on projets
  for all using (
    organisation_id = auth_organisation_id()
    and auth_role() in ('super_admin', 'admin_flotte')
  );

-- --- MISSIONS : chauffeur voit ses missions, admin/superviseur voient tout ---
create policy missions_select on missions
  for select using (
    organisation_id = auth_organisation_id()
    and (
      auth_role() in ('super_admin', 'admin_flotte', 'superviseur')
      or chauffeur_id in (select id from chauffeurs where utilisateur_id = auth.uid())
      or (auth_role() = 'bailleur' and projet_id in (
            select id from projets where organisation_id = auth_organisation_id()
          ))
    )
  );

create policy missions_write on missions
  for insert with check (
    organisation_id = auth_organisation_id()
    and auth_role() in ('super_admin', 'admin_flotte', 'superviseur', 'chauffeur')
  );

create policy missions_update on missions
  for update using (
    organisation_id = auth_organisation_id()
    and (
      auth_role() in ('super_admin', 'admin_flotte', 'superviseur')
      or chauffeur_id in (select id from chauffeurs where utilisateur_id = auth.uid())
    )
  );

-- --- PANNES/RÉPARATIONS : admin/superviseur tout, mécanicien maj statut+coût ---
create policy pannes_select on pannes_reparations
  for select using (organisation_id = auth_organisation_id());

create policy pannes_insert on pannes_reparations
  for insert with check (
    organisation_id = auth_organisation_id()
    and auth_role() in ('super_admin', 'admin_flotte', 'superviseur', 'chauffeur')
  );

create policy pannes_update on pannes_reparations
  for update using (
    organisation_id = auth_organisation_id()
    and auth_role() in ('super_admin', 'admin_flotte', 'superviseur', 'mecanicien')
  );

-- --- POSITIONS GPS : chauffeur insère les siennes, admin/superviseur lisent tout ---
create policy positions_select on positions_vehicules
  for select using (
    vehicule_id in (select id from vehicules where organisation_id = auth_organisation_id())
  );

create policy positions_insert on positions_vehicules
  for insert with check (
    vehicule_id in (
      select v.id from vehicules v
      join chauffeurs c on c.vehicule_assigne_id = v.id
      where c.utilisateur_id = auth.uid()
    )
    or auth_role() in ('super_admin', 'admin_flotte')
  );

-- --- ALERTES SOS : chauffeur déclenche, admin/superviseur lisent et résolvent ---
create policy sos_select on alertes_sos
  for select using (
    vehicule_id in (select id from vehicules where organisation_id = auth_organisation_id())
  );

create policy sos_insert on alertes_sos
  for insert with check (
    chauffeur_id in (select id from chauffeurs where utilisateur_id = auth.uid())
  );

create policy sos_update on alertes_sos
  for update using (
    vehicule_id in (select id from vehicules where organisation_id = auth_organisation_id())
    and auth_role() in ('super_admin', 'admin_flotte', 'superviseur')
  );
