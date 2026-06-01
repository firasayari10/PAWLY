import { describe, it, expect } from "vitest";
import {
  validateReviewInput,
  canReview,
  reviewabilityError,
  computeNewAverage,
} from "./reviews";

describe("validateReviewInput", () => {
  const base = { offre_id: "o1", note: 4, commentaire: "Super" };

  it("accepts a valid review", () => {
    expect(validateReviewInput(base)).toBeNull();
  });

  it("requires an offre_id", () => {
    expect(validateReviewInput({ ...base, offre_id: undefined })).toMatch(/Réservation/);
  });

  it("requires a note", () => {
    expect(validateReviewInput({ ...base, note: undefined })).toMatch(/note est requise/);
  });

  it("rejects out-of-range notes", () => {
    expect(validateReviewInput({ ...base, note: 0 })).toMatch(/entre 1 et 5/);
    expect(validateReviewInput({ ...base, note: 6 })).toMatch(/entre 1 et 5/);
  });

  it("rejects non-integer notes", () => {
    expect(validateReviewInput({ ...base, note: 3.5 })).toMatch(/note est requise/);
  });

  it("rejects an over-long comment", () => {
    expect(validateReviewInput({ ...base, commentaire: "x".repeat(1001) })).toMatch(/1000/);
  });
});

describe("canReview / reviewabilityError", () => {
  it("allows reviewing an accepted, paid, unreviewed booking", () => {
    const o = { statut: "accepte", statut_paiement: "paye", alreadyReviewed: false };
    expect(canReview(o)).toBe(true);
    expect(reviewabilityError(o)).toBeNull();
  });

  it("blocks an unpaid booking", () => {
    const o = { statut: "accepte", statut_paiement: "non_paye" };
    expect(canReview(o)).toBe(false);
    expect(reviewabilityError(o)).toMatch(/payées/);
  });

  it("blocks a booking that was already reviewed", () => {
    const o = { statut: "accepte", statut_paiement: "paye", alreadyReviewed: true };
    expect(canReview(o)).toBe(false);
    expect(reviewabilityError(o)).toMatch(/déjà noté/);
  });

  it("blocks a non-accepted booking", () => {
    expect(canReview({ statut: "refuse", statut_paiement: "paye" })).toBe(false);
  });
});

describe("computeNewAverage", () => {
  it("handles the very first review", () => {
    expect(computeNewAverage(0, 0, 5)).toEqual({ note_moyenne: 5, nb_avis: 1 });
  });

  it("folds a new note into an existing average", () => {
    // (4.5 * 10 + 5) / 11 = 50 / 11 = 4.5454... -> 4.55
    expect(computeNewAverage(4.5, 10, 5)).toEqual({ note_moyenne: 4.55, nb_avis: 11 });
  });

  it("rounds to two decimals", () => {
    // (4 * 1 + 3) / 2 = 3.5
    expect(computeNewAverage(4, 1, 3)).toEqual({ note_moyenne: 3.5, nb_avis: 2 });
  });

  it("treats invalid prior stats as a fresh start", () => {
    expect(computeNewAverage(Number.NaN, -2, 4)).toEqual({ note_moyenne: 4, nb_avis: 1 });
  });
});
