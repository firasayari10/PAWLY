import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { slugify } from "@/lib/journal";
import { resolveAccount } from "@/lib/account";

// POST /api/journal/from-offer — a sitter on an accepted booking resolves (or
// creates) the owner's journal for that animal so they can post updates.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { offre_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.offre_id) return NextResponse.json({ error: "Réservation manquante." }, { status: 400 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  // The caller must be the accepted sitter for this booking.
  const { data: offre } = await supabase
    .from("offre_garde")
    .select("id, proprietaire_id, nom_animal, type_animal, statut")
    .eq("id", body.offre_id)
    .eq("prestataire_id", me.id_user)
    .eq("statut", "accepte")
    .maybeSingle();
  if (!offre) return NextResponse.json({ error: "Garde acceptée introuvable." }, { status: 403 });

  // Find an existing journal for this owner + animal, else create one.
  const { data: existing } = await supabase
    .from("journal")
    .select("id")
    .eq("proprietaire_id", offre.proprietaire_id)
    .eq("nom_animal", offre.nom_animal)
    .maybeSingle();

  if (existing) return NextResponse.json({ journal: existing }, { status: 200 });

  const titre = `Carnet de ${offre.nom_animal}`;
  const { data: created, error } = await supabase
    .from("journal")
    .insert({
      proprietaire_id: offre.proprietaire_id,
      titre,
      nom_animal: offre.nom_animal,
      type_animal: offre.type_animal ?? "",
      is_public: false,
      public_slug: slugify(titre, Math.random().toString(36).slice(2, 8)),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ journal: created }, { status: 201 });
}
