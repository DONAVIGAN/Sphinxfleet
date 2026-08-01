# SPHINXFLEET — Architecture technique
### Application de gestion de parc automobile — Entreprises & ONG
**Portfolio SphinxApps** | Version 1.0 — MVP

---

## 1. Objectif

Application de gestion de flotte automobile pour entreprises et ONG en Afrique de l'Ouest francophone. Socle commun + modules activables selon le profil de l'organisation (Entreprise / ONG).

**Différenciateurs clés (pépites) :**
- Alertes automatiques d'échéances documents (assurance, visite technique, permis)
- Détection d'anomalies de consommation carburant
- Allocation des coûts par projet/bailleur (reporting ONG)
- Géolocalisation + bouton SOS (hybride : smartphone MVP → boîtier GPS matériel en V2)
- Mode offline-first (PWA)

---

## 2. Stack technique

| Couche | Choix |
|---|---|
| Frontend | React + Vite, PWA (offline-first, installable) |
| Backend | Supabase (Postgres + Auth + RLS + Storage) |
| Fonctions serverless | Vercel (proxy API, webhooks GPS/SOS) |
| Notifications | Zapier (SMS/email) + Web Push |
| Cartographie | Leaflet / Mapbox (affichage position temps réel) |
| Design | Anthracite/or, Inter — cohérent portfolio SphinxApps |

---

## 3. Rôles & RLS (Row Level Security)

| Rôle | Code | Périmètre |
|---|---|---|
| Super Admin | `super_admin` | Multi-organisations, gestion abonnements/licences |
| Admin Flotte | `admin_flotte` | Accès total sur son organisation |
| Superviseur de site | `superviseur` | Limité à son site/antenne (`site_id`) |
| Chauffeur | `chauffeur` | Ses missions, ses pannes déclarées, SOS |
| Bailleur / Observateur | `bailleur` | Lecture seule, filtré par `projet_id` |
| Mécanicien/Garage | `mecanicien` | Statut réparation + coût uniquement |

**Principe RLS :** chaque table métier porte une colonne `organisation_id`. Toutes les policies Supabase filtrent d'abord sur `organisation_id = auth.jwt() -> organisation_id`, puis affinent selon le rôle (ex: `chauffeur` ne voit que ses lignes `chauffeur_id = auth.uid()`).

---

## 4. Schéma de base de données (tables principales)

```sql
-- Organisations (multi-tenant)
organisations (
  id uuid PK,
  nom text,
  type text, -- 'entreprise' | 'ong'
  pays text, -- 'Niger' | 'Benin'
  created_at timestamptz
)

-- Utilisateurs / rôles
utilisateurs (
  id uuid PK, -- lié à auth.users
  organisation_id uuid FK,
  site_id uuid FK nullable,
  role text, -- voir table rôles ci-dessus
  nom text,
  telephone text
)

-- Sites/antennes (pour ONG multi-bases)
sites (
  id uuid PK,
  organisation_id uuid FK,
  nom text,
  ville text
)

-- Véhicules
vehicules (
  id uuid PK,
  organisation_id uuid FK,
  site_id uuid FK nullable,
  immatriculation text,
  marque text,
  modele text,
  annee int,
  type_carburant text, -- 'essence' | 'diesel' | 'electrique'
  kilometrage_actuel int,
  statut text, -- 'actif' | 'en_panne' | 'hors_service'
  date_acquisition date,
  valeur_acquisition numeric,
  vin text,
  photo_url text,
  created_at timestamptz
)

-- Documents véhicule (assurance, visite technique, vignette)
documents_vehicule (
  id uuid PK,
  vehicule_id uuid FK,
  type_document text, -- 'assurance' | 'visite_technique' | 'vignette' | 'carte_grise'
  date_expiration date,
  fichier_url text,
  statut_alerte text -- 'ok' | 'alerte' | 'expire'
)

-- Chauffeurs
chauffeurs (
  id uuid PK,
  organisation_id uuid FK,
  utilisateur_id uuid FK nullable, -- si a un compte app
  nom text,
  telephone text,
  numero_permis text,
  date_expiration_permis date,
  vehicule_assigne_id uuid FK nullable
)

-- Missions
missions (
  id uuid PK,
  organisation_id uuid FK,
  vehicule_id uuid FK,
  chauffeur_id uuid FK,
  projet_id uuid FK nullable, -- pour allocation coûts ONG
  date_debut timestamptz,
  date_fin timestamptz nullable,
  origine text,
  destination text,
  objectif text,
  km_depart int,
  km_arrivee int nullable,
  carburant_consomme_litres numeric nullable,
  statut text -- 'en_cours' | 'terminee'
)

-- Pannes & réparations
pannes_reparations (
  id uuid PK,
  organisation_id uuid FK,
  vehicule_id uuid FK,
  date_panne date,
  description text,
  garage text,
  pieces_changees text,
  cout numeric,
  statut text, -- 'signalee' | 'en_reparation' | 'resolue'
  declare_par uuid FK -- chauffeur ou admin
)

-- Positions GPS (agnostique de la source : smartphone ou boîtier futur)
positions_vehicules (
  id uuid PK,
  vehicule_id uuid FK,
  mission_id uuid FK nullable,
  latitude numeric,
  longitude numeric,
  source text, -- 'smartphone' | 'boitier_gps'
  timestamp timestamptz
)

-- Alertes SOS
alertes_sos (
  id uuid PK,
  vehicule_id uuid FK,
  chauffeur_id uuid FK,
  mission_id uuid FK nullable,
  latitude numeric,
  longitude numeric,
  statut text, -- 'declenchee' | 'en_cours' | 'resolue'
  created_at timestamptz,
  resolue_at timestamptz nullable
)

-- Projets/Bailleurs (module ONG)
projets (
  id uuid PK,
  organisation_id uuid FK,
  nom text,
  bailleur text,
  budget_vehicule numeric nullable,
  date_debut date,
  date_fin date nullable
)
```

---

## 5. Flux GPS + SOS (MVP hybride)

1. **Pendant une mission active**, l'app chauffeur (PWA) envoie la position toutes les X minutes via `navigator.geolocation` → insertion dans `positions_vehicules` (`source: 'smartphone'`).
2. **Bouton SOS** dans l'app : capture position immédiate → insert `alertes_sos` → trigger Supabase (Edge Function ou webhook Vercel) → notification push aux rôles `admin_flotte` + `superviseur` du site → SMS via Zapier en secours.
3. **Carte temps réel** (Leaflet) sur le dashboard Admin : affiche dernière position connue par véhicule, historique du trajet de la mission en cours.
4. **V2 (boîtier matériel)** : le boîtier GPS envoie ses données via SIM → webhook Vercel → même table `positions_vehicules` avec `source: 'boitier_gps'`. Bouton SOS physique câblé déclenche le même webhook `alertes_sos`. **Aucune refonte de schéma nécessaire.**

---

## 6. Alertes automatiques (documents & maintenance)

- Job planifié (Supabase Cron ou Vercel Cron) — quotidien :
  - Scan `documents_vehicule` : si `date_expiration` ≤ 30/15/7 jours → notification + email/SMS à `admin_flotte`.
  - Scan `chauffeurs` : permis proche expiration → même logique.
- Phase 2 : maintenance prédictive basée sur `kilometrage_actuel` vs seuils définis par véhicule.

---

## 7. Modules par profil d'organisation

**Entreprise**
- Rattachement véhicule ↔ service/département
- Suivi anomalies carburant (conso réelle vs théorique/km)

**ONG**
- Allocation des coûts par `projet_id`
- Rapport PDF périodique par bailleur (missions, coûts pannes, km parcourus)
- Multi-site actif par défaut

Le champ `organisations.type` détermine quels modules sont affichés dans l'UI (feature flags simples).

---

## 8. Roadmap

**Phase 1 — MVP (socle + hybride GPS)**
- Véhicules, Chauffeurs, Missions, Pannes/Réparations
- Alertes documents
- GPS smartphone + SOS logiciel
- Dashboard KPI de base
- Modules Entreprise/ONG (allocation coûts, rapports bailleur)

**Phase 2**
- Boîtier GPS matériel + SOS câblé
- Maintenance prédictive
- Scoring comportement chauffeur
- Gestion stock pièces détachées

---

## 9. Notes de conception

- Toutes les tables `organisation_id`-scoped, RLS stricte par défaut (deny-by-default).
- PWA offline-first : missions et pannes créables hors-ligne, synchronisées à la reconnexion (IndexedDB local, cohérent avec SphinxPOS).
- Paiement local (MTN MoMo, Moov, Nita, Amana) prévu pour la case abonnement, modèle économique à définir ultérieurement.
