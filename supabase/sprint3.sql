-- ============================================================
-- PAWLY — Sprint 3 migrations
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- AFTER sprint2.sql and fix.sql.
-- ============================================================

-- ── US11 — Paiement : payment lifecycle on offre_garde ───────
-- statut_paiement : non_paye | paye | rembourse
ALTER TABLE offre_garde ADD COLUMN IF NOT EXISTS statut_paiement        TEXT DEFAULT 'non_paye';
ALTER TABLE offre_garde ADD COLUMN IF NOT EXISTS stripe_session_id      TEXT;
ALTER TABLE offre_garde ADD COLUMN IF NOT EXISTS stripe_payment_intent  TEXT;
ALTER TABLE offre_garde ADD COLUMN IF NOT EXISTS paid_at                TIMESTAMPTZ;

-- Helpful indexes for webhook lookups & owner listings
CREATE INDEX IF NOT EXISTS offre_garde_stripe_session_idx ON offre_garde (stripe_session_id);
CREATE INDEX IF NOT EXISTS offre_garde_proprietaire_idx   ON offre_garde (proprietaire_id);

-- ── Infos vétérinaire : one contact record per owner ─────────
-- Named `info_veterinaire` to avoid colliding with the pre-existing
-- `veterinaire` clinic directory in the base Sprint 1 schema.
-- "Stockage sécurisé": only ever read/written through the service-role
-- server APIs, gated behind an ownership or active-booking relationship.
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
