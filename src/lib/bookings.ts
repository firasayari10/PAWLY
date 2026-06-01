// ============================================================
// PAWLY — Booking domain logic (pure, framework-free, unit-tested)
// Keeping the money + state-machine rules here means they can be tested
// without Clerk, Supabase or Stripe, and reused by every route.
// ============================================================

export type StatutOffre = "en_attente" | "accepte" | "refuse" | "annule";
export type StatutPaiement = "non_paye" | "paye" | "rembourse";

export const MS_PER_DAY = 86_400_000;

/**
 * Number of billed days between two ISO dates. At least 1 day is always billed,
 * matching the offer-creation logic. Returns 0 only when an input is missing.
 */
export function computeNbJours(dateDebut: string, dateFin: string): number {
  if (!dateDebut || !dateFin) return 0;
  const start = new Date(dateDebut).getTime();
  const end = new Date(dateFin).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
}

/** Total price in euros, rounded to the cent. */
export function computeTarifTotal(tarifJour: number, nbJours: number): number {
  if (!Number.isFinite(tarifJour) || tarifJour < 0) return 0;
  if (nbJours <= 0) return 0;
  return Math.round(tarifJour * nbJours * 100) / 100;
}

/**
 * Convert a euro amount to the integer minor unit (cents) Stripe expects.
 * Throws on non-finite or non-positive amounts — we never create a 0€ session.
 */
export function eurosToStripeAmount(euros: number): number {
  if (!Number.isFinite(euros)) throw new Error("Montant invalide.");
  const cents = Math.round(euros * 100);
  if (cents <= 0) throw new Error("Le montant doit être strictement positif.");
  return cents;
}

/** Validate that an offer is in a payable state (accepted and not yet paid). */
export function canPay(offre: {
  statut: string;
  statut_paiement?: string | null;
}): boolean {
  return offre.statut === "accepte" && (offre.statut_paiement ?? "non_paye") === "non_paye";
}

/** Human-readable reason an offer cannot be paid, or null when it can. */
export function payabilityError(offre: {
  statut: string;
  statut_paiement?: string | null;
}): string | null {
  if (offre.statut !== "accepte") {
    return "Le paiement n'est possible qu'une fois la demande acceptée par le prestataire.";
  }
  if ((offre.statut_paiement ?? "non_paye") === "paye") {
    return "Cette réservation a déjà été payée.";
  }
  if ((offre.statut_paiement ?? "non_paye") === "rembourse") {
    return "Cette réservation a été remboursée.";
  }
  return null;
}

/** Validate the payload for creating a booking/offer. Returns an error or null. */
export function validateBookingInput(input: {
  prestataire_id?: string;
  type_animal?: string;
  nom_animal?: string;
  date_debut?: string;
  date_fin?: string;
}): string | null {
  const { prestataire_id, type_animal, nom_animal, date_debut, date_fin } = input;
  if (!prestataire_id || !type_animal || !nom_animal || !date_debut || !date_fin) {
    return "Champs requis manquants.";
  }
  const start = new Date(date_debut).getTime();
  const end = new Date(date_fin).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "Dates invalides.";
  if (end <= start) return "La date de fin doit être après la date de début.";
  return null;
}
