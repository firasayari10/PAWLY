import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { validateReviewInput, reviewabilityError, computeNewAverage } from "@/lib/reviews";

// POST /api/reviews — the owner rates a completed (accepted + paid) booking.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { offre_id?: string; note?: number; commentaire?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validationError = validateReviewInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createServerSupabase();

  const { data: me } = await supabase
    .from("utilisateur")
    .select("id_user")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });

  // The booking must belong to this owner.
  const { data: offre, error: offreError } = await supabase
    .from("offre_garde")
    .select("id, prestataire_id, statut, statut_paiement")
    .eq("id", body.offre_id!)
    .eq("proprietaire_id", me.id_user)
    .maybeSingle();
  if (offreError) return NextResponse.json({ error: offreError.message }, { status: 500 });
  if (!offre) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });

  // Already reviewed?
  const { data: existing } = await supabase
    .from("avis_offre")
    .select("id")
    .eq("offre_id", offre.id)
    .maybeSingle();

  const blocked = reviewabilityError({
    statut: offre.statut,
    statut_paiement: offre.statut_paiement,
    alreadyReviewed: Boolean(existing),
  });
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

  // Insert the review.
  const { data: avis, error: insertError } = await supabase
    .from("avis_offre")
    .insert({
      offre_id: offre.id,
      proprietaire_id: me.id_user,
      prestataire_id: offre.prestataire_id,
      note: body.note,
      commentaire: body.commentaire ?? "",
    })
    .select("*")
    .single();

  if (insertError) {
    // Unique violation → someone reviewed in the meantime.
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Vous avez déjà noté cette réservation." }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Fold the rating into the prestataire's running average.
  const { data: profil } = await supabase
    .from("prestataire_profil")
    .select("note_moyenne, nb_avis")
    .eq("utilisateur_id", offre.prestataire_id)
    .maybeSingle();

  if (profil) {
    const next = computeNewAverage(Number(profil.note_moyenne), Number(profil.nb_avis), body.note!);
    await supabase
      .from("prestataire_profil")
      .update({ note_moyenne: next.note_moyenne, nb_avis: next.nb_avis })
      .eq("utilisateur_id", offre.prestataire_id);
  }

  return NextResponse.json({ avis }, { status: 201 });
}
