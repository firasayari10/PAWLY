import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { isAdmin, accountModeration } from "@/lib/admin";
import { resolveAccount } from "@/lib/account";

// PATCH /api/admin/users/:id — suspend or reactivate a user account (admin only).
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

  const moderation = accountModeration(body.action ?? "");
  if ("error" in moderation) return NextResponse.json({ error: moderation.error }, { status: 400 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;
  if (!isAdmin(me.role)) return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });

  if (id === me.id_user) {
    return NextResponse.json({ error: "Vous ne pouvez pas modérer votre propre compte." }, { status: 409 });
  }

  const { data: updated, error } = await supabase
    .from("utilisateur")
    .update({ statut_compte: moderation.statut_compte })
    .eq("id_user", id)
    .select("id_user, statut_compte")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

  return NextResponse.json({ user: updated });
}
