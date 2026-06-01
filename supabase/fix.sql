-- ============================================================
-- PAWLY — Schema fixes (run AFTER sprint2.sql)
-- ============================================================

-- Fix 1: Allow NULL telephone so multiple users without phones can coexist.
-- PostgreSQL UNIQUE allows multiple NULLs; empty strings do not have that luxury.
UPDATE utilisateur SET telephone = NULL WHERE telephone = '';

ALTER TABLE utilisateur
  DROP CONSTRAINT IF EXISTS utilisateur_telephone_key;

CREATE UNIQUE INDEX IF NOT EXISTS utilisateur_telephone_nonempty
  ON utilisateur (telephone)
  WHERE telephone IS NOT NULL AND telephone != '';

-- Fix 2: Latitude / longitude columns may not exist yet if you ran an older schema.
-- These are safe no-ops if the columns already exist.
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION DEFAULT 0;
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT 0;
