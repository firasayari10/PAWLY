import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { sendConfirmationEmail, sendRefusalEmail } from "@/lib/email";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: { action: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;
  if (!["accepter", "refuser"].includes(action)) {
    return NextResponse.json({ error: "Action invalide (accepter | refuser)." }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Verify the caller is the prestataire for this offer
  const { data: me } = await supabase
    .from("utilisateur")
    .select("id_user, prenom, nom, role")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!me || me.role !== "prestataire") {
    return NextResponse.json({ error: "Réservé aux prestataires." }, { status: 403 });
  }

  const { data: offre, error: offreError } = await supabase
    .from("offre_garde")
    .select(`
      id, type_animal, nom_animal, nb_animaux,
      date_debut, date_fin, tarif_total, statut,
      proprietaire:proprietaire_id (
        prenom, nom, email
      )
    `)
    .eq("id", id)
    .eq("prestataire_id", me.id_user)
    .maybeSingle();

  if (offreError) return NextResponse.json({ error: offreError.message }, { status: 500 });
  if (!offre)     return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
  if (offre.statut !== "en_attente") {
    return NextResponse.json({ error: "Cette offre a déjà été traitée." }, { status: 409 });
  }

  const newStatut = action === "accepter" ? "accepte" : "refuse";

  const { error: updateError } = await supabase
    .from("offre_garde")
    .update({ statut: newStatut })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Send email notification — non-blocking, failures are logged but don't break the response
  const prop = Array.isArray(offre.proprietaire) ? offre.proprietaire[0] : offre.proprietaire;
  if (prop?.email) {
    const emailPayload = {
      nomAnimal:    offre.nom_animal,
      typeAnimal:   offre.type_animal,
      nbAnimaux:    offre.nb_animaux,
      dateDebut:    offre.date_debut,
      dateFin:      offre.date_fin,
      tarifTotal:   offre.tarif_total,
      prestataire:  { prenom: me.prenom, nom: me.nom },
      proprietaire: { prenom: prop.prenom, nom: prop.nom, email: prop.email },
    };
    try {
      if (action === "accepter") await sendConfirmationEmail(emailPayload);
      else                       await sendRefusalEmail(emailPayload);
    } catch (err) {
      console.error("[DASHBOARD] Email error:", err);
    }
  }

  return NextResponse.json({ message: `Offre ${newStatut}.`, statut: newStatut });
}
