import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin";
import { resolveAccount } from "@/lib/account";

// GET /api/admin/signalements — list reports, newest first, optional ?statut= filter (admin only).
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  if (!isAdmin(account.user.role)) return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const statut = searchParams.get("statut");

  let query = supabase
    .from("signalement")
    .select("id, type, cible_id, signale_par, motif, statut, created_at, resolved_at")
    .order("created_at", { ascending: false });

  if (statut) query = query.eq("statut", statut);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signalements: data ?? [] });
}
