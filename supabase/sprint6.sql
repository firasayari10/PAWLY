-- ============================================================
-- PAWLY — Sprint 6 : E2E-encrypted chat for accepted bookings
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run)
-- AFTER sprint2.sql, fix.sql, sprint3.sql, sprint4.sql and sprint5.sql.
-- Idempotent — safe to re-run.
--
-- Sprint 6 ships US17 — Messagerie : a private, end-to-end-encrypted chat between
-- the owner (proprietaire) and the sitter (prestataire) of an ACCEPTED booking
-- (offre_garde.statut = 'accepte').
--
-- Naming note: the original Sprint 1 schema already contains `conversation` and
-- `message` tables with a different shape, so — exactly like Sprint 3/4 did with
-- avis_offre / info_veterinaire — these features use the prefixed tables
-- `chat_conversation` and `chat_message` to avoid colliding with them.
--
-- Privacy model: the server only ever stores ciphertext. Messages are encrypted
-- in the browser with ECDH P-256 + AES-256-GCM; private keys never leave the
-- device. The columns below hold base64 ciphertext + nonce only.
--
-- ── PREREQUISITE (one-time, done in the dashboards, NOT in SQL) ───────────────
-- Live delivery uses Supabase Realtime, gated by RLS, with the browser carrying
-- the Clerk session JWT. For that to authenticate you must first bridge Clerk to
-- Supabase:
--   1. Supabase Dashboard → Authentication → Third-Party Auth → Add provider →
--      Clerk, and paste your Clerk Frontend API / domain.
--   2. Clerk Dashboard → enable the Supabase integration so the session token
--      carries a stable `sub` (the Clerk user id) and `role: 'authenticated'`.
-- After that, `auth.jwt() ->> 'sub'` inside the policies below resolves to the
-- caller's Clerk id, which we map to utilisateur.clerk_id.
-- (Without this step, the polling fallback GET still works; only live push and
--  the RLS read policies require it.)
-- ============================================================


-- ── One conversation per accepted offre_garde ────────────────
-- Participants are copied onto the row so the RLS policies stay a single-table
-- lookup and don't have to join back through offre_garde on every check.
CREATE TABLE IF NOT EXISTS chat_conversation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offre_id        UUID NOT NULL UNIQUE REFERENCES offre_garde(id) ON DELETE CASCADE,
  proprietaire_id UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  prestataire_id  UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_conversation_prop_idx  ON chat_conversation (proprietaire_id);
CREATE INDEX IF NOT EXISTS chat_conversation_prest_idx ON chat_conversation (prestataire_id);


-- ── Messages : ciphertext only ───────────────────────────────
-- `ciphertext` is base64 AES-256-GCM output; `iv` is the base64 12-byte nonce
-- used for that message. The server cannot decrypt either.
CREATE TABLE IF NOT EXISTS chat_message (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversation(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  ciphertext      TEXT NOT NULL,
  iv              TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  read_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS chat_message_conv_idx ON chat_message (conversation_id, created_at);


-- ── One ECDH P-256 public key per user ───────────────────────
-- The matching private key is generated and kept in the browser (IndexedDB) and
-- is never sent to the server. A peer fetches this public key to derive the
-- shared AES key for the conversation.
CREATE TABLE IF NOT EXISTS user_public_key (
  utilisateur_id UUID PRIMARY KEY REFERENCES utilisateur(id_user) ON DELETE CASCADE,
  public_key     TEXT NOT NULL,            -- base64 SPKI
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);


-- ── Row Level Security ───────────────────────────────────────
-- READS go through the browser anon client carrying the Clerk JWT, so they are
-- gated by these SELECT policies. WRITES go through the Next.js API routes using
-- the service-role key, which bypasses RLS (the API re-validates participation,
-- the accepted state and account suspension before every insert).
ALTER TABLE chat_conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_public_key   ENABLE ROW LEVEL SECURITY;

-- A participant may read their own conversations.
DROP POLICY IF EXISTS chat_conv_participant_read ON chat_conversation;
CREATE POLICY chat_conv_participant_read ON chat_conversation FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM utilisateur u
    WHERE u.clerk_id = auth.jwt() ->> 'sub'
      AND u.id_user IN (chat_conversation.proprietaire_id, chat_conversation.prestataire_id)
  )
);

-- A participant may read the messages of their own conversations.
DROP POLICY IF EXISTS chat_msg_participant_read ON chat_message;
CREATE POLICY chat_msg_participant_read ON chat_message FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_conversation c
    JOIN utilisateur u ON u.clerk_id = auth.jwt() ->> 'sub'
    WHERE c.id = chat_message.conversation_id
      AND u.id_user IN (c.proprietaire_id, c.prestataire_id)
  )
);

-- Public keys are readable by any authenticated user (you need the peer's key to
-- encrypt to them). Only public material lives here — never a private key.
DROP POLICY IF EXISTS pubkey_read ON user_public_key;
CREATE POLICY pubkey_read ON user_public_key FOR SELECT USING (
  auth.role() = 'authenticated'
);


-- ── Enable Realtime on chat_message ──────────────────────────
-- Guarded: if the table is already in the publication (or your role lacks the
-- right) the rest of the migration still applies. Realtime respects the SELECT
-- policy above, so a subscriber only receives messages from their own
-- conversations.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_message;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Realtime publication step skipped (already added or insufficient rights): %', SQLERRM;
END $$;
