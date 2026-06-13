-- ============================================================
-- PAWLY — Sprint 1 : schéma de base (table `utilisateur`)
-- À EXÉCUTER EN TOUT PREMIER dans le SQL Editor de Supabase
-- (Dashboard → SQL Editor → New query → Run), AVANT sprint2.sql.
-- Idempotent — sans danger à relancer.
--
-- NOTE : ce fichier a été reconstruit à partir des colonnes réellement
-- écrites/lues par l'application (voir src/app/api/profile/sync-utilisateur/route.ts
-- et src/lib/account.ts). Si votre projet Supabase contient déjà une table
-- `utilisateur` issue du Sprint 1 d'origine, ce script ne l'écrasera pas
-- (CREATE TABLE IF NOT EXISTS) ; vérifiez simplement que les colonnes ci-dessous
-- existent.
--
-- Toutes les autres tables (offre_garde, prestataire_profil, avis_offre,
-- info_veterinaire, journal*, veterinaire_clinique, signalement, chat_*,
-- user_public_key) sont créées par sprint2.sql → sprint7.sql.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- pour gen_random_uuid()

CREATE TABLE IF NOT EXISTS utilisateur (
  id_user                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité Clerk : seul lien fiable entre la session Clerk et la ligne BDD.
  clerk_id                   TEXT UNIQUE,

  -- Coordonnées
  prenom                     TEXT DEFAULT '',
  nom                        TEXT DEFAULT '',
  email                      TEXT,
  password_hash              TEXT DEFAULT '',   -- hérité du Sprint 1 (l'auth passe par Clerk)
  telephone                  TEXT,              -- l'unicité est gérée par fix.sql (index partiel)
  adresse                    TEXT DEFAULT '',
  code_postal                TEXT DEFAULT '',
  ville                      TEXT DEFAULT '',
  latitude                   DOUBLE PRECISION DEFAULT 0,
  longitude                  DOUBLE PRECISION DEFAULT 0,

  -- Documents (US02 — validation de compte)
  piece_identite_url         TEXT DEFAULT '',
  attestation_assurance_url  TEXT DEFAULT '',
  photo_profil               TEXT DEFAULT '',

  -- Rôle applicatif : 'proprietaire' | 'prestataire' | 'admin'
  role                       TEXT DEFAULT 'proprietaire',

  -- Statut du compte : 'en_attente' | 'actif' | 'suspendu'
  -- Seul 'suspendu' bloque l'accès à l'API (voir src/lib/account.ts).
  statut_compte              TEXT DEFAULT 'en_attente',

  email_verifie              BOOLEAN DEFAULT false,
  telephone_verifie          BOOLEAN DEFAULT false,
  date_creation              TIMESTAMPTZ DEFAULT now()
);

-- Recherche rapide par clerk_id (utilisée sur quasiment chaque requête authentifiée).
CREATE INDEX IF NOT EXISTS utilisateur_clerk_id_idx ON utilisateur (clerk_id);
