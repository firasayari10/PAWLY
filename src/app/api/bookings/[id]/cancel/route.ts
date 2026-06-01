import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { cancellationPolicy } from "@/lib/cancellation";
import { sendCancellationEmail } from "@/lib/email";

// PUT /api/bookings/:id/cancel — owner cancels a booking, refunding if it was paid.
export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: me } = await supabase
    .from("utilisateur")
    .select("id_user")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });

  const { data: offre, error: offreError } = await supabase
    .from("offre_garde")
    .select(`
      id, nom_animal, type_animal, nb_animaux, date_debut, date_fin,
      statut, statut_paiement, tarif_total, stripe_payment_intent,
      proprietaire:proprietaire_id ( prenom, nom, email ),
      prestataire:prestataire_id ( prenom, nom, email )
    `)
    .eq("id", id)
    .eq("proprietaire_id", me.id_user)
    .maybeSingle();

  if (offreError) return NextResponse.json({ error: offreError.message }, { status: 500 });
  if (!offre) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });

  const decision = cancellationPolicy({
    statut: offre.statut,
    statut_paiement: offre.statut_paiement,
    date_debut: offre.date_debut,
  });

  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason ?? "Annulation impossible." }, { status: 409 });
  }

  // Issue a Stripe refund when required.
  let refundId: string | null = null;
  if (decision.refund === "full") {
    if (!offre.stripe_payment_intent) {
      return NextResponse.json({ error: "Paiement introuvable pour le remboursement." }, { status: 422 });
    }
    try {
      const refund = await getStripe().refunds.create({ payment_intent: offre.stripe_payment_intent });
      refundId = refund.id;
    } catch (err) {
      console.error("[CANCEL] Refund error:", err);
      return NextResponse.json({ error: "Le remboursement a échoué. Réessayez ou contactez le support." }, { status: 502 });
    }
  }

  const { error: updateError } = await supabase
    .from("offre_garde")
    .update({
      statut: decision.newStatut,
      statut_paiement: decision.newPaiement,
      annule_at: new Date().toISOString(),
      stripe_refund_id: refundId,
    })
    .eq("id", offre.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Best-effort notification.
  const prop = Array.isArray(offre.proprietaire) ? offre.proprietaire[0] : offre.proprietaire;
  const prest = Array.isArray(offre.prestataire) ? offre.prestataire[0] : offre.prestataire;
  if (prop?.email) {
    try {
      await sendCancellationEmail({
        nomAnimal: offre.nom_animal,
        typeAnimal: offre.type_animal,
        nbAnimaux: offre.nb_animaux,
        dateDebut: offre.date_debut,
        dateFin: offre.date_fin,
        tarifTotal: offre.tarif_total,
        prestataire: { prenom: prest?.prenom ?? "", nom: prest?.nom ?? "" },
        proprietaire: { prenom: prop.prenom, nom: prop.nom, email: prop.email },
        refunded: decision.refund === "full",
      });
    } catch (err) {
      console.error("[CANCEL] Email error:", err);
    }
  }

  return NextResponse.json({
    statut: decision.newStatut,
    statut_paiement: decision.newPaiement,
    refunded: decision.refund === "full",
  });
}
