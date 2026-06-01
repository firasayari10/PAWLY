import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { applyCheckoutCompleted } from "@/lib/payments";
import { sendPaymentReceiptEmail, sendPaymentNoticeToSitter } from "@/lib/email";

// POST /api/payments/confirm — called when the user returns from Stripe Checkout
// (success_url). This reconciles the payment by retrieving the session from
// Stripe and fulfilling it if paid, so the booking is confirmed even when the
// webhook listener isn't running (e.g. local dev). The webhook remains the
// authoritative path; both share the idempotent applyCheckoutCompleted.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { offre_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { offre_id } = body;
  if (!offre_id) return NextResponse.json({ error: "offre_id requis." }, { status: 400 });

  const supabase = createServerSupabase();

  const { data: me } = await supabase
    .from("utilisateur")
    .select("id_user")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });

  // Verify ownership and get the stored Checkout Session id.
  const { data: offre } = await supabase
    .from("offre_garde")
    .select("id, statut_paiement, stripe_session_id")
    .eq("id", offre_id)
    .eq("proprietaire_id", me.id_user)
    .maybeSingle();

  if (!offre) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  if (offre.statut_paiement === "paye") return NextResponse.json({ status: "already_paid" });
  if (!offre.stripe_session_id) {
    return NextResponse.json({ error: "Aucune session de paiement à confirmer." }, { status: 409 });
  }

  // Ask Stripe for the authoritative payment status.
  const session = await getStripe().checkout.sessions.retrieve(offre.stripe_session_id);
  if (session.payment_status !== "paid") {
    return NextResponse.json({ status: "pending" });
  }

  const result = await applyCheckoutCompleted(supabase, session);

  if (result.status === "paid") {
    const o = result.offre;
    const payload = {
      nomAnimal: o.nom_animal,
      typeAnimal: o.type_animal,
      nbAnimaux: o.nb_animaux,
      dateDebut: o.date_debut,
      dateFin: o.date_fin,
      tarifTotal: o.tarif_total,
      prestataire: { prenom: o.prestataire?.prenom ?? "", nom: o.prestataire?.nom ?? "" },
      proprietaire: {
        prenom: o.proprietaire?.prenom ?? "",
        nom: o.proprietaire?.nom ?? "",
        email: o.proprietaire?.email ?? "",
      },
    };
    try {
      if (o.proprietaire?.email) await sendPaymentReceiptEmail(payload);
      if (o.prestataire?.email) await sendPaymentNoticeToSitter({ ...payload, prestataireEmail: o.prestataire.email });
    } catch (err) {
      console.error("[CONFIRM] Email error:", err);
    }
  }

  return NextResponse.json({ status: result.status });
}
