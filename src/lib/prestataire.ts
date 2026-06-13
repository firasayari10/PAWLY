/**
 * Shapes and helpers for the `prestataire_profil` embedded relation returned by Supabase.
 *
 * A Supabase embedded relation (e.g. `utilisateur.select("..., prestataire_profil(...)")`)
 * comes back as a single object, an array, or null depending on the query/cardinality.
 * `firstEmbedded` normalizes any of those into a single row (or null).
 */

export type PrestataireProfil = {
  id: string;
  bio: string | null;
  tarif_jour: number | null;
  types_animaux: string[] | null;
  rayon_km: number | null;
  annees_experience: number | null;
  note_moyenne: number | null;
  nb_avis: number | null;
  disponible: boolean | null;
};

/** A row joined with the `prestataire_profil` relation, plus any other selected columns. */
export type RowWithPrestataireProfil = {
  statut_compte?: string | null;
  prestataire_profil?: PrestataireProfil | PrestataireProfil[] | null;
  [key: string]: unknown;
};

/** Normalize a Supabase embedded relation (object | array | null) to a single row. */
export function firstEmbedded<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
