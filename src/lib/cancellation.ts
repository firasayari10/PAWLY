// ============================================================
// PAWLY — Cancellation policy (pure, framework-free, unit-tested)
// ============================================================

import type { StatutPaiement } from "./bookings";

export interface CancellationDecision {
  allowed: boolean;
  /** "full" → issue a Stripe refund; "none" → nothing to refund. */
  refund: "full" | "none";
  reason: string | null;
  newStatut: "annule" | null;
  newPaiement: StatutPaiement | null;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Cancellation rules (owner-initiated):
 *  - Already terminated (refusée/annulée) → not allowed.
 *  - Paid booking, stay not yet started → allowed, full refund.
 *  - Paid booking, stay already started → not allowed (no refund mid-stay).
 *  - Unpaid booking (pending or accepted-unpaid) → allowed, no refund.
 */
export function cancellationPolicy(
  offre: { statut: string; statut_paiement?: string | null; date_debut: string },
  now: Date = new Date(),
): CancellationDecision {
  if (offre.statut === "annule" || offre.statut === "refuse") {
    return { allowed: false, refund: "none", reason: "Cette réservation est déjà terminée.", newStatut: null, newPaiement: null };
  }

  const paid = (offre.statut_paiement ?? "non_paye") === "paye";
  const started = startOfDay(new Date(offre.date_debut)) <= startOfDay(now);

  if (paid) {
    if (started) {
      return {
        allowed: false,
        refund: "none",
        reason: "La garde a déjà commencé : l'annulation n'est plus possible.",
        newStatut: null,
        newPaiement: null,
      };
    }
    return { allowed: true, refund: "full", reason: null, newStatut: "annule", newPaiement: "rembourse" };
  }

  // Unpaid: free to cancel, nothing to refund.
  return {
    allowed: true,
    refund: "none",
    reason: null,
    newStatut: "annule",
    newPaiement: (offre.statut_paiement as StatutPaiement) ?? "non_paye",
  };
}
