import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { computeNbJours, computeTarifTotal, validateBookingInput } from "@/lib/bookings";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    prestataire_id?: string;
    type_animal?: string;
    nom_animal?: string;
    nb_animaux?: number;
    date_debut?: string;
    date_fin?: string;
    message?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prestataire_id, type_animal, nom_animal, nb_animaux, date_debut, date_fin, message } = body;

  const validationError = validateBookingInput({ prestataire_id, type_animal, nom_animal, date_debut, date_fin });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Resolve proprietaire_id from clerk_id
  const { data: owner, error: ownerError } = await supabase
    .from("utilisateur")
    .select("id_user")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (ownerError || !owner) {
    return NextResponse.json({ error: "Profil introuvable. Complétez d'abord votre profil." }, { status: 404 });
  }

  // Compute tarif_total from prestataire's tarif_jour
  const { data: profil } = await supabase
    .from("prestataire_profil")
    .select("tarif_jour")
    .eq("utilisateur_id", prestataire_id)
    .maybeSingle();

  const nb_jours = computeNbJours(date_debut!, date_fin!);
  const tarif_total = profil ? computeTarifTotal(Number(profil.tarif_jour), nb_jours) : null;

  const { data: offer, error: insertError } = await supabase
    .from("offre_garde")
    .insert({
      proprietaire_id: owner.id_user,
      prestataire_id,
      type_animal,
      nom_animal,
      nb_animaux: nb_animaux ?? 1,
      date_debut,
      date_fin,
      message: message ?? "",
      statut: "en_attente",
      tarif_total,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ offer }, { status: 201 });
}
