-- ============================================================
-- PAWLY — Sprint 4 migrations  (idempotent — safe to re-run)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- AFTER sprint2.sql, fix.sql and sprint3.sql.
--
-- NOTE: the database already contains an original Sprint 1 schema where
-- `avis` is foreign-keyed to `reservation` and `veterinaire` is a clinic
-- directory. The PAWLY web app is built on `offre_garde`, so Sprint 3/4
-- features use offre-aligned tables (`avis_offre`, `info_veterinaire`) to
-- avoid colliding with those pre-existing tables.
-- ============================================================

-- ── US13 — Annulation : cancellation / refund tracking ───────
ALTER TABLE offre_garde ADD COLUMN IF NOT EXISTS stripe_refund_id  TEXT;
ALTER TABLE offre_garde ADD COLUMN IF NOT EXISTS annule_at         TIMESTAMPTZ;

-- ── Infos vétérinaire : per-owner contact (Sprint 3 feature) ──
-- (Distinct from the `veterinaire` clinic directory in the base schema.)
CREATE TABLE IF NOT EXISTS info_veterinaire (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietaire_id   UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  nom_veterinaire   TEXT DEFAULT '',
  nom_clinique      TEXT DEFAULT '',
  telephone         TEXT DEFAULT '',
  email             TEXT DEFAULT '',
  adresse           TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (proprietaire_id)
);

-- ── US12 — Notation : reviews tied to offre_garde bookings ────
-- One review per booking; note constrained to 1..5.
CREATE TABLE IF NOT EXISTS avis_offre (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offre_id         UUID NOT NULL REFERENCES offre_garde(id) ON DELETE CASCADE,
  proprietaire_id  UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  prestataire_id   UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  note             INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire      TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (offre_id)
);

CREATE INDEX IF NOT EXISTS avis_offre_prestataire_idx ON avis_offre (prestataire_id);
