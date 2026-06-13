import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// PAWLY — Browser Supabase client (anon key + Clerk JWT)
// Used ONLY by the chat feature for Realtime reads. The client carries the
// Clerk session token so Supabase Third-Party Auth (Clerk) can identify the
// user and apply the RLS read policies from sprint6.sql. Every WRITE still goes
// through the Clerk-authed Next API routes (service-role).
// ============================================================

type TokenGetter = () => Promise<string | null>;

/**
 * Create a browser Supabase client whose every request (incl. Realtime) carries
 * the current Clerk session token. Pass Clerk's `session.getToken`.
 */
export function createBrowserSupabase(getToken: TokenGetter): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes.");
  }
  return createClient(url, anonKey, {
    accessToken: async () => (await getToken()) ?? null,
    realtime: { params: { eventsPerSecond: 5 } },
  });
}
