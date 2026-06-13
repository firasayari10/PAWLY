// ============================================================
// PAWLY — Account access guard
// Centralises "who is the caller" resolution + suspension enforcement so a
// suspended account (statut_compte = 'suspendu') is blocked on every
// authenticated route, not just hidden from search.
// ============================================================

import type { createServerSupabase } from "./supabase-server";

export const SUSPENDED = "suspendu";

export interface AccountUser {
  id_user: string;
  role: string | null;
  statut_compte: string | null;
  prenom: string | null;
  nom: string | null;
  email: string | null;
}

/**
 * Pure check: is this account allowed to use the API?
 * Returns an error descriptor when the account is suspended, else null.
 */
export function accountAccessError(
  statutCompte: string | null | undefined,
): { status: number; error: string } | null {
  if (statutCompte === SUSPENDED) {
    return { status: 403, error: "Compte suspendu." };
  }
  return null;
}

type ServerSupabase = ReturnType<typeof createServerSupabase>;

export type ResolveAccountResult =
  | { ok: true; user: AccountUser }
  | { ok: false; status: number; error: string };

/**
 * Resolve the acting user from their Clerk id and enforce suspension.
 * - 404 when no PAWLY profile exists yet
 * - 403 when the account is suspended
 * - otherwise the user row
 */
export async function resolveAccount(
  supabase: ServerSupabase,
  clerkUserId: string,
): Promise<ResolveAccountResult> {
  const { data, error } = await supabase
    .from("utilisateur")
    .select("id_user, role, statut_compte, prenom, nom, email")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: error.message };

  const user = data as unknown as AccountUser | null;
  if (!user) return { ok: false, status: 404, error: "Profil introuvable." };

  const blocked = accountAccessError(user.statut_compte);
  if (blocked) return { ok: false, status: blocked.status, error: blocked.error };

  return { ok: true, user };
}
