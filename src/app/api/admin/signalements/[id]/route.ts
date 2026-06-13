import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { isAdmin, signalementResolution, canResolveSignalement } from "@/lib/admin";
import { resolveAccount } from "@/lib/account";

// PATCH /api/admin/signalements/:id — resolve or reject an open report (admin only).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resolution = signalementResolution(body.action ?? "");
  if ("error" in resolution) return NextResponse.json({ error: resolution.error }, { status: 400 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  if (!isAdmin(account.user.role)) return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });

  const { data: signalement } = await supabase
    .from("signalement")
    .select("id, statut")
    .eq("id", id)
    .maybeSingle();
  if (!signalement) return NextResponse.json({ error: "Signalement introuvable." }, { status: 404 });
  if (!canResolveSignalement(signalement.statut)) {
    return NextResponse.json({ error: "Ce signalement a déjà été traité." }, { status: 409 });
  }

  const { data: updated, error } = await supabase
    .from("signalement")
    .update({ statut: resolution.statut, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, statut, resolved_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signalement: updated });
}
