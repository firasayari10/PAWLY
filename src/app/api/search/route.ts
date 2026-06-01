import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ville       = searchParams.get("ville") ?? "";
  const type_animal = searchParams.get("type_animal") ?? "";
  const tarif_max   = searchParams.get("tarif_max") ? Number(searchParams.get("tarif_max")) : null;

  const supabase = createServerSupabase();

  let query = supabase
    .from("utilisateur")
    .select(`
      id_user, prenom, nom, ville, code_postal,
      latitude, longitude, photo_profil,
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

  type RawRow = typeof data extends (infer R)[] | null ? R : never;

  let results = (data ?? []).map((u: RawRow) => {
    const profil = Array.isArray((u as any).prestataire_profil)
      ? (u as any).prestataire_profil[0]
      : (u as any).prestataire_profil;
    return { ...(u as any), profil };
  });

  // JS-level filters (Supabase !inner doesn't support filtering on embedded cols)
  if (tarif_max !== null) {
    results = results.filter((r) => r.profil?.tarif_jour <= tarif_max);
  }
  if (type_animal) {
    results = results.filter((r) => r.profil?.types_animaux?.includes(type_animal));
  }
  results = results.filter((r) => r.profil?.disponible !== false);

  return NextResponse.json({ results, count: results.length });
}
