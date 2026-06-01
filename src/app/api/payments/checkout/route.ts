import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { eurosToStripeAmount, payabilityError } from "@/lib/bookings";

// POST /api/payments/checkout — create a Stripe Checkout Session for an accepted
// booking. The amount is ALWAYS recomputed server-side from the stored tarif_total;
// the client never sends a price.
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

  // Resolve the caller and ensure they own this booking.
  const { data: me } = await supabase
    .from("utilisateur")
    .select("id_user, email")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!me) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });

  const { data: offre, error: offreError } = await supabase
    .from("offre_garde")
    .select("id, proprietaire_id, nom_animal, type_animal, statut, statut_paiement, tarif_total")
    .eq("id", offre_id)
    .eq("proprietaire_id", me.id_user)
    .maybeSingle();

  if (offreError) return NextResponse.json({ error: offreError.message }, { status: 500 });
  if (!offre) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });

  // State-machine guard (accepted + not already paid).
  const blocked = payabilityError(offre);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

  if (offre.tarif_total == null || Number(offre.tarif_total) <= 0) {
    return NextResponse.json({ error: "Montant indisponible pour cette réservation." }, { status: 422 });
  }

  let amount: number;
  try {
    amount = eurosToStripeAmount(Number(offre.tarif_total));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Montant invalide." }, { status: 422 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: me.email ?? undefined,
    client_reference_id: offre.id,
    metadata: { offre_id: offre.id, proprietaire_id: offre.proprietaire_id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name: `Garde de ${offre.nom_animal} (${offre.type_animal})`,
            description: "Réservation PAWLY — paiement sous séquestre",
          },
        },
      },
    ],
    success_url: `${appUrl}/bookings?payment=success&offre=${offre.id}`,
    cancel_url: `${appUrl}/bookings?payment=cancelled&offre=${offre.id}`,
  });

  // Persist the session id so the webhook can reconcile and to prevent dup sessions.
  await supabase
    .from("offre_garde")
    .update({ stripe_session_id: session.id })
    .eq("id", offre.id);

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
