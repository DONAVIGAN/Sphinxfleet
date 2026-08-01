# SPHINXFLEET — Passation à Yakou
Date : 30 juillet 2026

## État actuel : MVP fonctionnel, testé en conditions réelles

L'application tourne en local (`npm run dev`), connectée à un projet Supabase de dev.
Authentification, RLS, et 4 modules sur 7 ont été testés avec de vraies données et fonctionnent :

✅ **Testé et fonctionnel**
- Connexion / authentification (rôle admin_flotte)
- Véhicules : création, liste, badge documents — OK
- Chauffeurs : création, liste — OK (permis sans date d'expiration, non renouvelable dans ce contexte)
- Pannes & réparations : formulaire de signalement ajouté et testé — OK
- Missions : formulaire corrigé pour permettre à un admin de sélectionner véhicule + chauffeur manuellement (un admin n'a pas de fiche chauffeur propre) — OK

⚠️ **Non testés en conditions réelles — à vérifier en premier**
- Carte de la flotte (Leaflet + positions GPS + alertes SOS)
- Projets & bailleurs (module ONG)
- Rapport bailleur (export PDF)
- Anomalies carburant (logique OK mais aucune donnée réelle testée avec conso théorique + carburant mission renseignés)
- Flux SOS complet (webhook Vercel `api/sos-alert.js`) — jamais déployé/testé en prod
- Cron alertes échéances (`api/alertes-echeances.js`) — jamais déployé/testé en prod

## Bugs corrigés durant les tests (pattern à surveiller ailleurs)

Plusieurs formulaires ne passaient pas `organisation_id` à l'insertion, bloqués par les policies RLS (erreur 403). Corrigé sur Véhicules, Chauffeurs, Missions, Pannes. **Vérifier qu'aucun autre formulaire futur n'oublie ce champ.**

La fonction SQL `auth_organisation_id()` bouclait à l'infini (elle interrogeait `utilisateurs`, qui a une policy RLS qui rappelle la fonction). Corrigée avec `security definer` — voir migration appliquée manuellement en base, **à documenter en migration 004** si ce n'est pas déjà fait dans le repo.

## Environnement

- Code : `~/sphinxfleet` (WSL Ubuntu)
- Migrations SQL : `supabase-migrations/001, 002, 003` (+ le fix `security definer` à ajouter en 004)
- `.env` configuré avec les vraies clés Supabase (ne pas committer)
- Un compte organisation "SPHINX Niger" (type entreprise) et un compte admin existent déjà en base

## Prochaines étapes suggérées pour Yakou

1. Tester et déboguer les 4 modules non vérifiés ci-dessus
2. Ajouter la migration 004 documentant le fix `security definer`
3. Déployer sur Vercel (variables d'env à configurer : voir README du projet)
4. Configurer le Database Webhook Supabase → `/api/sos-alert` et le Cron Vercel → `/api/alertes-echeances`
5. Phase 2 (roadmap architecture) : boîtier GPS matériel, maintenance prédictive, scoring chauffeur, stock pièces
