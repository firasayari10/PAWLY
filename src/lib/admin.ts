// ============================================================
// PAWLY — Admin / moderation domain logic (pure, unit-tested)
// ============================================================

export const SIGNALEMENT_TYPES = ["profil", "avis", "reservation"] as const;
export type SignalementType = (typeof SIGNALEMENT_TYPES)[number];

export const MAX_MOTIF_LENGTH = 1000;

/** Is this role an administrator? */
export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Validate a report (signalement) payload. Returns an error message or null. */
export function validateSignalementInput(input: {
  type?: string;
  cible_id?: string;
  motif?: string;
}): string | null {
  if (!input.type || !SIGNALEMENT_TYPES.includes(input.type as SignalementType)) {
    return "Type de signalement invalide.";
  }
  if (!input.cible_id?.trim()) return "Élément signalé manquant.";
  if (!input.motif?.trim()) return "Le motif du signalement est requis.";
  if (input.motif.trim().length > MAX_MOTIF_LENGTH) {
    return `Le motif ne peut pas dépasser ${MAX_MOTIF_LENGTH} caractères.`;
  }
  return null;
}

/**
 * Resolve a report. A report can only move out of 'ouvert'.
 * Returns the next status or an error.
 */
export function signalementResolution(
  action: string,
): { statut: "resolu" | "rejete" } | { error: string } {
  if (action === "resoudre") return { statut: "resolu" };
  if (action === "rejeter") return { statut: "rejete" };
  return { error: "Action de modération invalide." };
}

/** Guard: only open reports can be acted on. */
export function canResolveSignalement(current: string): boolean {
  return current === "ouvert";
}

/**
 * Account moderation: suspend or reactivate a user.
 * Returns the next `statut_compte` or an error.
 */
export function accountModeration(
  action: string,
): { statut_compte: "actif" | "suspendu" } | { error: string } {
  if (action === "suspendre") return { statut_compte: "suspendu" };
  if (action === "reactiver") return { statut_compte: "actif" };
  return { error: "Action de modération invalide." };
}

/**
 * Remove one rating from a prestataire's running average (used when an admin
 * deletes an abusive review). Mirrors computeNewAverage in reviews.ts.
 */
export function removeFromAverage(
  oldAvg: number,
  oldCount: number,
  removedNote: number,
): { note_moyenne: number; nb_avis: number } {
  const safeAvg = Number.isFinite(oldAvg) && oldAvg > 0 ? oldAvg : 0;
  const safeCount = Number.isFinite(oldCount) && oldCount > 0 ? oldCount : 0;
  if (safeCount <= 1) return { note_moyenne: 0, nb_avis: 0 };
  const total = safeAvg * safeCount - removedNote;
  const count = safeCount - 1;
  const avg = Math.round((total / count) * 100) / 100;
  return { note_moyenne: avg < 0 ? 0 : avg, nb_avis: count };
}
