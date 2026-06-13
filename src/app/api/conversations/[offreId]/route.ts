import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";
import { canChat, isParticipant, peerId } from "@/lib/conversations";

// GET /api/conversations/:offreId — resolve (lazy-create) the conversation for an
// accepted booking the caller participates in, and return the peer + their public
// key so the client can derive the shared encryption key.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ offreId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offreId } = await params;
  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const { data: offre, error: offreError } = await supabase
    .from("offre_garde")
    .select("id, proprietaire_id, prestataire_id, statut")
    .eq("id", offreId)
    .maybeSingle();

  if (offreError) return NextResponse.json({ error: offreError.message }, { status: 500 });
  if (!offre || !isParticipant(me.id_user, offre)) {
    // Same response whether it doesn't exist or isn't yours — no enumeration.
    return NextResponse.json({ error: "Conversation introuvable." }, { status: 403 });
  }
  if (!canChat(offre.statut)) {
    return NextResponse.json({ error: "La discussion s'ouvre une fois la garde acceptée." }, { status: 403 });
  }

  // Lazy-create the conversation (idempotent on offre_id).
  const { data: conversation, error: convError } = await supabase
    .from("chat_conversation")
    .upsert(
      { offre_id: offre.id, proprietaire_id: offre.proprietaire_id, prestataire_id: offre.prestataire_id },
      { onConflict: "offre_id" },
    )
    .select("id, offre_id, proprietaire_id, prestataire_id")
    .single();

  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });

  const peer = peerId(me.id_user, offre);
  const { data: peerUser } = await supabase
    .from("utilisateur")
    .select("id_user, prenom, nom, photo_profil")
    .eq("id_user", peer!)
    .maybeSingle();

  const { data: peerKey } = await supabase
    .from("user_public_key")
    .select("public_key")
    .eq("utilisateur_id", peer!)
    .maybeSingle();

  return NextResponse.json({
    conversation,
    me: { id_user: me.id_user },
    peer: {
      id_user: peer,
      prenom: peerUser?.prenom ?? null,
      nom: peerUser?.nom ?? null,
      photo_profil: peerUser?.photo_profil ?? null,
      public_key: peerKey?.public_key ?? null,
    },
  });
}
