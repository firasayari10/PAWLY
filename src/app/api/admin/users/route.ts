import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin";
import { resolveAccount } from "@/lib/account";

// GET /api/admin/users — list every user + lightweight platform stats (admin only).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  if (!isAdmin(account.user.role)) return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });

  const { data: users, error } = await supabase
    .from("utilisateur")
    .select("id_user, prenom, nom, email, role, statut_compte, ville, date_creation")
    .order("date_creation", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = users ?? [];
  const stats = {
    total: list.length,
    proprietaires: list.filter((u) => u.role === "proprietaire").length,
    prestataires: list.filter((u) => u.role === "prestataire").length,
    suspendus: list.filter((u) => u.statut_compte === "suspendu").length,
  };

  return NextResponse.json({ users: list, stats });
}
