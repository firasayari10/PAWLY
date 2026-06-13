import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";
import { firstEmbedded, type RowWithPrestataireProfil } from "@/lib/prestataire";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ville       = searchParams.get("ville") ?? "";
  const type_animal = searchParams.get("type_animal") ?? "";
  const tarif_max   = searchParams.get("tarif_max") ? Number(searchParams.get("tarif_max")) : null;

  const supabase = createServerSupabase();

  // A suspended caller may not browse the directory.
  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });

  let query = supabase
    .from("utilisateur")
    .select(`
      id_user, prenom, nom, ville, code_postal,
      latitude, longitude, photo_profil, statut_compte,
      prestataire_profil!inner (
        id, bio, tarif_jour, types_animaux,
        rayon_km, annees_experience, note_moyenne, nb_avis, disponible
      )
    `)
    .eq("role", "prestataire");

  if (ville) {
    query = query.ilike("ville", `%${ville}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let results = ((data ?? []) as RowWithPrestataireProfil[]).map((u) => {
    const profil = firstEmbedded(u.prestataire_profil);
    return { ...u, profil };
  });

  // JS-level filters (Supabase !inner doesn't support filtering on embedded cols)
  if (tarif_max !== null) {
    results = results.filter((r) => (r.profil?.tarif_jour ?? 0) <= tarif_max);
  }
  if (type_animal) {
    results = results.filter((r) => r.profil?.types_animaux?.includes(type_animal));
  }
  results = results.filter((r) => r.profil?.disponible !== false);
  // Suspended accounts (moderated by an admin) are hidden from search.
  results = results.filter((r) => r.statut_compte !== "suspendu");

  return NextResponse.json({ results, count: results.length });
}
