-- ============================================================
-- PAWLY — Sprint 5 migrations  (idempotent — safe to re-run)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run)
-- AFTER sprint2.sql, fix.sql, sprint3.sql and sprint4.sql.
--
-- Sprint 5 ships three features:
--   US14 — E-journal      : journal / journal_entry / journal_photo (+ storage bucket)
--   US15 — Vétérinaires   : veterinaire_clinique directory (seeded) for the web map
--   US16 — Admin          : role='admin' + signalement (reports / disputes)
--
-- The tables are created first; the Supabase Storage bucket is created last,
-- inside a guarded block, so a permissions hiccup on storage can never roll
-- back the table creation.
-- ============================================================


-- ── US16 — Admin role ────────────────────────────────────────
-- `utilisateur.role` is already a free-form TEXT column (today it holds
-- 'proprietaire' or 'prestataire'). Admins are promoted manually — see the
-- UPDATE statement at the very bottom of this file.


-- ── US14 — E-journal : a per-animal diary owned by a proprietaire ─
-- An entry may be authored by the owner (pet diary) OR by a sitter during an
-- accepted booking (offre_garde) — hence journal_entry.offre_id is nullable.
CREATE TABLE IF NOT EXISTS journal (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietaire_id UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  titre           TEXT NOT NULL DEFAULT '',
  nom_animal      TEXT NOT NULL DEFAULT '',
  type_animal     TEXT NOT NULL DEFAULT '',
  is_public       BOOLEAN NOT NULL DEFAULT false,
  public_slug     TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_proprietaire_idx ON journal (proprietaire_id);

CREATE TABLE IF NOT EXISTS journal_entry (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id  UUID NOT NULL REFERENCES journal(id) ON DELETE CASCADE,
  auteur_id   UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  offre_id    UUID REFERENCES offre_garde(id) ON DELETE SET NULL,  -- set when a sitter posts
  titre       TEXT NOT NULL DEFAULT '',
  contenu     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_entry_journal_idx ON journal_entry (journal_id);

CREATE TABLE IF NOT EXISTS journal_photo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    UUID NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  chemin      TEXT NOT NULL DEFAULT '',   -- storage path, for later deletion
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_photo_entry_idx ON journal_photo (entry_id);


-- ── US15 — Vétérinaires : clinic directory shown on the web map ─
-- Distinct from any pre-existing `veterinaire` base-schema table (same naming
-- discipline used by Sprint 3/4 for info_veterinaire / avis_offre).
CREATE TABLE IF NOT EXISTS veterinaire_clinique (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT NOT NULL,
  adresse     TEXT DEFAULT '',
  ville       TEXT DEFAULT '',
  code_postal TEXT DEFAULT '',
  telephone   TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed a handful of clinics across France (idempotent on nom+ville).
CREATE UNIQUE INDEX IF NOT EXISTS veterinaire_clinique_nom_ville_key
  ON veterinaire_clinique (nom, ville);

INSERT INTO veterinaire_clinique (nom, adresse, ville, code_postal, telephone, email, latitude, longitude) VALUES
  ('Clinique Vétérinaire des Lilas',      '12 rue de Belleville',     'Paris',      '75019', '01 42 00 11 22', 'contact@vetlilas.fr',      48.8720,  2.3770),
  ('Cabinet Vétérinaire de la Croix-Rousse','8 boulevard des Canuts', 'Lyon',       '69004', '04 78 00 33 44', 'accueil@vetcroixrousse.fr',45.7745,  4.8320),
  ('Clinique Vétérinaire du Vieux-Port',  '24 quai du Port',          'Marseille',  '13002', '04 91 00 55 66', 'contact@vetvieuxport.fr',  43.2960,  5.3700),
  ('Vétérinaire Capitole',                '5 place du Capitole',      'Toulouse',   '31000', '05 61 00 77 88', 'soins@vetcapitole.fr',     43.6045,  1.4440),
  ('Clinique Vétérinaire des Quinconces', '15 allées de Tourny',      'Bordeaux',   '33000', '05 56 00 99 00', 'contact@vetquinconces.fr', 44.8450, -0.5740),
  ('Cabinet Vétérinaire du Grand-Place',  '3 rue Esquermoise',        'Lille',      '59000', '03 20 00 12 34', 'accueil@vetlille.fr',      50.6370,  3.0630),
  ('Clinique Vétérinaire de l''Erdre',    '18 quai de Versailles',    'Nantes',     '44000', '02 40 00 56 78', 'contact@veterdre.fr',      47.2230, -1.5530),
  ('Vétérinaire Petite-France',           '7 rue des Dentelles',      'Strasbourg', '67000', '03 88 00 90 12', 'soins@vetpetitefrance.fr', 48.5800,  7.7400)
ON CONFLICT (nom, ville) DO NOTHING;


-- ── US16 — Admin : signalements (reports / disputes) ─────────
CREATE TABLE IF NOT EXISTS signalement (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL CHECK (type IN ('profil', 'avis', 'reservation')),
  cible_id     UUID NOT NULL,                                   -- id of the reported entity
  signale_par  UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  motif        TEXT NOT NULL DEFAULT '',
  statut       TEXT NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'resolu', 'rejete')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS signalement_statut_idx ON signalement (statut);


-- ── US14 — Storage bucket for journal photos (guarded) ───────
-- Public bucket so photos are readable via their public URL. The app uploads
-- with the service-role key (which bypasses RLS), so the SELECT policy below
-- is only a nicety. The whole block is guarded: if your role lacks rights on
-- the storage schema, the tables above are still created — just create the
-- bucket manually (Dashboard → Storage → New bucket → "journal-photos", Public).
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('journal-photos', 'journal-photos', true)
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "journal photos public read" ON storage.objects';
    EXECUTE 'CREATE POLICY "journal photos public read" ON storage.objects FOR SELECT USING (bucket_id = ''journal-photos'')';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Storage policy skipped (bucket is public, so reads still work): %', SQLERRM;
  END;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage bucket step skipped — create "journal-photos" (public) via the Dashboard: %', SQLERRM;
END $$;


-- ── FINAL STEP — promote yourself to admin (US16) ────────────
-- Replace the email with YOUR account email, then run this line:
--
--     UPDATE utilisateur SET role = 'admin' WHERE email = 'ton-email@exemple.fr';
