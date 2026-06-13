// ============================================================
// PAWLY — Conversation resolution (server-side, Supabase-backed)
// Shared by the chat message and attachment routes. The pure access rules live
// in `conversations.ts`; this helper applies them against the database.
// ============================================================

import type { createServerSupabase } from "@/lib/supabase-server";
import type { AccountUser } from "@/lib/account";
import { canChat, isParticipant } from "@/lib/conversations";

type ServerSupabase = ReturnType<typeof createServerSupabase>;

export type ResolvedConversation =
  | { ok: true; conversationId: string }
  | { ok: false; status: number; error: string };

// Resolve the offre, enforce participation + accepted state, and return the
// (lazily-created) conversation id.
export async function resolveConversation(
  supabase: ServerSupabase,
  me: AccountUser,
  offreId: string,
): Promise<ResolvedConversation> {
  const { data: offre, error } = await supabase
    .from("offre_garde")
    .select("id, proprietaire_id, prestataire_id, statut")
    .eq("id", offreId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: error.message };
  if (!offre || !isParticipant(me.id_user, offre)) {
    return { ok: false, status: 403, error: "Conversation introuvable." };
  }
  if (!canChat(offre.statut)) {
    return { ok: false, status: 403, error: "La discussion s'ouvre une fois la garde acceptée." };
  }

  const { data: conv, error: convError } = await supabase
    .from("chat_conversation")
    .upsert(
      { offre_id: offre.id, proprietaire_id: offre.proprietaire_id, prestataire_id: offre.prestataire_id },
      { onConflict: "offre_id" },
    )
    .select("id")
    .single();

  if (convError || !conv) return { ok: false, status: 500, error: convError?.message ?? "Conversation indisponible." };
  return { ok: true, conversationId: conv.id as string };
}
