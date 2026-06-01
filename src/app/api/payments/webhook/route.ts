import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServerSupabase } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { applyCheckoutCompleted } from "@/lib/payments";
import { sendPaymentReceiptEmail, sendPaymentNoticeToSitter } from "@/lib/email";

// Stripe must reach this endpoint unauthenticated (allow-listed in proxy.ts).
// We authenticate the request by verifying the signature instead.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Raw body is required for signature verification.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const supabase = createServerSupabase();

    try {
      const result = await applyCheckoutCompleted(supabase, session);

      if (result.status === "paid") {
        const { offre } = result;
        const payload = {
          nomAnimal: offre.nom_animal,
          typeAnimal: offre.type_animal,
          nbAnimaux: offre.nb_animaux,
          dateDebut: offre.date_debut,
          dateFin: offre.date_fin,
          tarifTotal: offre.tarif_total,
          prestataire: { prenom: offre.prestataire?.prenom ?? "", nom: offre.prestataire?.nom ?? "" },
          proprietaire: {
            prenom: offre.proprietaire?.prenom ?? "",
            nom: offre.proprietaire?.nom ?? "",
            email: offre.proprietaire?.email ?? "",
          },
        };
        // Best-effort notifications — never fail the webhook on email errors.
        try {
          if (offre.proprietaire?.email) await sendPaymentReceiptEmail(payload);
          if (offre.prestataire?.email) {
            await sendPaymentNoticeToSitter({ ...payload, prestataireEmail: offre.prestataire.email });
          }
        } catch (mailErr) {
          console.error("[WEBHOOK] Email error:", mailErr);
        }
      }
    } catch (err) {
      console.error("[WEBHOOK] Fulfilment error:", err);
      // 500 → Stripe retries, which is what we want on a transient DB failure.
      return NextResponse.json({ error: "Fulfilment failed." }, { status: 500 });
    }
  }

  // Acknowledge all other event types so Stripe stops retrying them.
  return NextResponse.json({ received: true });
}
