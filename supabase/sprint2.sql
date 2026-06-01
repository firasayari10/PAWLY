-- ============================================================
-- PAWLY — Sprint 2 migrations
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── prestataire_profil ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS prestataire_profil (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id      UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  bio                 TEXT DEFAULT '',
  tarif_jour          NUMERIC(8,2) DEFAULT 25.00,
  types_animaux       TEXT[] DEFAULT '{}',   -- e.g. {'chien','chat','lapin'}
  rayon_km            INTEGER DEFAULT 10,
  annees_experience   INTEGER DEFAULT 0,
  note_moyenne        NUMERIC(3,2) DEFAULT 0.00,
  nb_avis             INTEGER DEFAULT 0,
  disponible          BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (utilisateur_id)
);

-- ── offre_garde ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offre_garde (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietaire_id UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  prestataire_id  UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  type_animal     TEXT NOT NULL,
  nom_animal      TEXT NOT NULL,
  nb_animaux      INTEGER DEFAULT 1,
  date_debut      DATE NOT NULL,
  date_fin        DATE NOT NULL,
  message         TEXT DEFAULT '',
  statut          TEXT DEFAULT 'en_attente', -- en_attente | accepte | refuse | annule
  tarif_total     NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Seed: demo prestataires (optional — run separately) ──────
-- To have test data, run this after creating a few test accounts
-- and changing their role to 'prestataire' in the utilisateur table.
--
-- UPDATE utilisateur SET statut_compte = 'actif' WHERE role = 'prestataire';
--
-- INSERT INTO prestataire_profil (utilisateur_id, bio, tarif_jour, types_animaux, rayon_km, annees_experience, note_moyenne, nb_avis)
-- SELECT id_user, 'Passionné des animaux depuis toujours, je prends soin de vos compagnons avec amour.', 30, '{chien,chat}', 10, 3, 4.8, 24
-- FROM utilisateur WHERE role = 'prestataire' LIMIT 1;
