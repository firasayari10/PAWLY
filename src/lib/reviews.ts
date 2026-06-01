// ============================================================
// PAWLY — Review domain logic (pure, framework-free, unit-tested)
// ============================================================

export const MIN_NOTE = 1;
export const MAX_NOTE = 5;
export const MAX_COMMENT_LENGTH = 1000;

/** Validate a review payload. Returns an error message or null. */
export function validateReviewInput(input: {
  offre_id?: string;
  note?: number;
  commentaire?: string;
}): string | null {
  if (!input.offre_id) return "Réservation manquante.";
  if (input.note == null || !Number.isInteger(input.note)) {
    return "La note est requise.";
  }
  if (input.note < MIN_NOTE || input.note > MAX_NOTE) {
    return `La note doit être comprise entre ${MIN_NOTE} et ${MAX_NOTE}.`;
  }
  if ((input.commentaire ?? "").length > MAX_COMMENT_LENGTH) {
    return `Le commentaire ne peut pas dépasser ${MAX_COMMENT_LENGTH} caractères.`;
  }
  return null;
}

/**
 * A booking can be reviewed once it has been accepted and paid (the stay is
 * confirmed), and only if it hasn't already been reviewed.
 */
export function canReview(offre: {
  statut: string;
  statut_paiement?: string | null;
  alreadyReviewed?: boolean;
}): boolean {
  return (
    offre.statut === "accepte" &&
    (offre.statut_paiement ?? "non_paye") === "paye" &&
    !offre.alreadyReviewed
  );
}

/** Human-readable reason a booking can't be reviewed, or null when it can. */
export function reviewabilityError(offre: {
  statut: string;
  statut_paiement?: string | null;
  alreadyReviewed?: boolean;
}): string | null {
  if (offre.alreadyReviewed) return "Vous avez déjà noté cette réservation.";
  if (offre.statut !== "accepte" || (offre.statut_paiement ?? "non_paye") !== "paye") {
    return "Seules les réservations payées peuvent être notées.";
  }
  return null;
}

/**
 * Fold a new rating into a prestataire's running average.
 * Average is rounded to 2 decimals to match the NUMERIC(3,2) column.
 */
export function computeNewAverage(
  oldAvg: number,
  oldCount: number,
  newNote: number,
): { note_moyenne: number; nb_avis: number } {
  const safeAvg = Number.isFinite(oldAvg) && oldAvg > 0 ? oldAvg : 0;
  const safeCount = Number.isFinite(oldCount) && oldCount > 0 ? oldCount : 0;
  const total = safeAvg * safeCount + newNote;
  const count = safeCount + 1;
  const avg = Math.round((total / count) * 100) / 100;
  return { note_moyenne: avg, nb_avis: count };
}
