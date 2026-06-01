import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export interface FulfilledOffre {
  id: string;
  nom_animal: string;
  type_animal: string;
  nb_animaux: number;
  date_debut: string;
  date_fin: string;
  tarif_total: number | null;
  proprietaire: { prenom: string; nom: string; email: string } | null;
  prestataire: { prenom: string; nom: string; email: string } | null;
}

export type FulfilResult =
  | { status: "no_offre_id" }
  | { status: "not_found" }
  | { status: "already_paid"; offre: FulfilledOffre }
  | { status: "paid"; offre: FulfilledOffre };

function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/**
 * Mark a booking as paid from a completed Checkout Session.
 *
 * Source of truth for fulfilment (the success redirect is not trusted).
 * Idempotent: a session replayed by Stripe will report `already_paid` and make
 * no further writes, so receipts are never sent twice.
 *
 * Pure of side-effects beyond the DB write — emails are sent by the caller so
 * this stays unit-testable with a fake Supabase client.
 */
export async function applyCheckoutCompleted(
  supabase: SupabaseClient,
  session: Pick<Stripe.Checkout.Session, "metadata" | "client_reference_id" | "payment_intent">,
): Promise<FulfilResult> {
  const offreId =
    session.metadata?.offre_id ?? session.client_reference_id ?? null;
  if (!offreId) return { status: "no_offre_id" };

  const { data: offre } = await supabase
    .from("offre_garde")
    .select(`
      id, nom_animal, type_animal, nb_animaux, date_debut, date_fin,
      tarif_total, statut_paiement,
      proprietaire:proprietaire_id ( prenom, nom, email ),
      prestataire:prestataire_id ( prenom, nom, email )
    `)
    .eq("id", offreId)
    .maybeSingle();

  if (!offre) return { status: "not_found" };

  const shaped: FulfilledOffre = {
    id: offre.id,
    nom_animal: offre.nom_animal,
    type_animal: offre.type_animal,
    nb_animaux: offre.nb_animaux,
    date_debut: offre.date_debut,
    date_fin: offre.date_fin,
    tarif_total: offre.tarif_total,
    proprietaire: firstOrNull(offre.proprietaire),
    prestataire: firstOrNull(offre.prestataire),
  };

  // Idempotency guard — never re-fulfil an already-paid booking.
  if (offre.statut_paiement === "paye") {
    return { status: "already_paid", offre: shaped };
  }

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await supabase
    .from("offre_garde")
    .update({
      statut_paiement: "paye",
      paid_at: new Date().toISOString(),
      stripe_payment_intent: paymentIntent,
    })
    .eq("id", offreId);

  return { status: "paid", offre: shaped };
}
