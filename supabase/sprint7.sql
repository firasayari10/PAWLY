-- ============================================================
-- PAWLY — Sprint 7 : encrypted chat attachments (images & vidéos)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run)
-- AFTER sprint2.sql, fix.sql, sprint3.sql, sprint4.sql, sprint5.sql and sprint6.sql.
-- Idempotent — safe to re-run.
--
-- Adds a PRIVATE Storage bucket `chat-attachments` for the chat between the
-- owner and the sitter. Files are AES-256-GCM-encrypted in the browser with the
-- conversation key BEFORE upload, so the bucket only ever holds opaque
-- `application/octet-stream` ciphertext — the server cannot read any of it.
--
-- Access model (mirrors chat_message): no storage.objects policies on purpose.
-- The bucket is private, so anon/authenticated clients can never list or read
-- it directly. All uploads/downloads go through short-lived signed URLs minted
-- by the Next.js API (service-role key) AFTER it has re-validated the caller's
-- participation, the accepted booking state and account suspension
-- (src/app/api/conversations/[offreId]/attachments/route.ts).
--
-- file_size_limit: 50 Mo (video cap) + headroom for the 16-byte GCM tag. This
-- is the HARD server-side cap — the per-kind limits (10 Mo image / 50 Mo video)
-- are validated client-side and at signed-URL issuance, but the encrypted
-- contents themselves are invisible to the server (E2EE trade-off).
-- ============================================================

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'chat-attachments',
    'chat-attachments',
    false,
    52429000,                              -- 50 Mo + GCM tag headroom
    ARRAY['application/octet-stream']      -- ciphertext only
  )
  ON CONFLICT (id) DO UPDATE
    SET public             = false,
        file_size_limit    = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Bucket step skipped — create "chat-attachments" manually via Dashboard → Storage (PRIVATE, 50 Mo limit, mime application/octet-stream): %', SQLERRM;
END $$;
