import { describe, it, expect } from "vitest";
import {
  computeNbJours,
  computeTarifTotal,
  eurosToStripeAmount,
  canPay,
  payabilityError,
  validateBookingInput,
} from "./bookings";

describe("computeNbJours", () => {
  it("counts whole days between two dates", () => {
    expect(computeNbJours("2026-04-10", "2026-04-15")).toBe(5);
  });

  it("bills at least one day for same-day or sub-day ranges", () => {
    expect(computeNbJours("2026-04-10", "2026-04-10")).toBe(1);
  });

  it("rounds partial days up", () => {
    expect(computeNbJours("2026-04-10T08:00:00Z", "2026-04-11T10:00:00Z")).toBe(2);
  });

  it("returns 0 when a date is missing", () => {
    expect(computeNbJours("", "2026-04-15")).toBe(0);
    expect(computeNbJours("2026-04-10", "")).toBe(0);
  });

  it("returns 0 for invalid dates", () => {
    expect(computeNbJours("not-a-date", "2026-04-15")).toBe(0);
  });
});

describe("computeTarifTotal", () => {
  it("multiplies the daily rate by the number of days", () => {
    expect(computeTarifTotal(30, 5)).toBe(150);
  });

  it("rounds to the cent", () => {
    expect(computeTarifTotal(33.333, 3)).toBe(100); // 33.333 * 3 = 99.999 -> 100.00
    expect(computeTarifTotal(25.5, 2)).toBe(51);
  });

  it("returns 0 for non-positive inputs", () => {
    expect(computeTarifTotal(30, 0)).toBe(0);
    expect(computeTarifTotal(-5, 3)).toBe(0);
    expect(computeTarifTotal(Number.NaN, 3)).toBe(0);
  });
});

describe("eurosToStripeAmount", () => {
  it("converts euros to integer cents", () => {
    expect(eurosToStripeAmount(183)).toBe(18300);
    expect(eurosToStripeAmount(25.5)).toBe(2550);
  });

  it("rounds float noise to the nearest cent", () => {
    expect(eurosToStripeAmount(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30
  });

  it("throws on zero or negative amounts", () => {
    expect(() => eurosToStripeAmount(0)).toThrow();
    expect(() => eurosToStripeAmount(-10)).toThrow();
  });

  it("throws on non-finite amounts", () => {
    expect(() => eurosToStripeAmount(Number.NaN)).toThrow();
    expect(() => eurosToStripeAmount(Infinity)).toThrow();
  });
});

describe("canPay", () => {
  it("is true for an accepted, unpaid booking", () => {
    expect(canPay({ statut: "accepte", statut_paiement: "non_paye" })).toBe(true);
  });

  it("defaults missing payment status to unpaid", () => {
    expect(canPay({ statut: "accepte" })).toBe(true);
    expect(canPay({ statut: "accepte", statut_paiement: null })).toBe(true);
  });

  it("is false when not accepted", () => {
    expect(canPay({ statut: "en_attente", statut_paiement: "non_paye" })).toBe(false);
    expect(canPay({ statut: "refuse", statut_paiement: "non_paye" })).toBe(false);
  });

  it("is false when already paid", () => {
    expect(canPay({ statut: "accepte", statut_paiement: "paye" })).toBe(false);
  });
});

describe("payabilityError", () => {
  it("returns null when payable", () => {
    expect(payabilityError({ statut: "accepte", statut_paiement: "non_paye" })).toBeNull();
  });

  it("explains a not-yet-accepted booking", () => {
    expect(payabilityError({ statut: "en_attente" })).toMatch(/acceptée/);
  });

  it("explains an already-paid booking", () => {
    expect(payabilityError({ statut: "accepte", statut_paiement: "paye" })).toMatch(/déjà été payée/);
  });

  it("explains a refunded booking", () => {
    expect(payabilityError({ statut: "accepte", statut_paiement: "rembourse" })).toMatch(/remboursée/);
  });
});

describe("validateBookingInput", () => {
  const base = {
    prestataire_id: "p1",
    type_animal: "chien",
    nom_animal: "Rex",
    date_debut: "2026-04-10",
    date_fin: "2026-04-15",
  };

  it("accepts a valid payload", () => {
    expect(validateBookingInput(base)).toBeNull();
  });

  it("rejects missing required fields", () => {
    expect(validateBookingInput({ ...base, nom_animal: "" })).toMatch(/requis/);
    expect(validateBookingInput({ ...base, prestataire_id: undefined })).toMatch(/requis/);
  });

  it("rejects an end date that is not after the start", () => {
    expect(validateBookingInput({ ...base, date_fin: "2026-04-10" })).toMatch(/après/);
    expect(validateBookingInput({ ...base, date_fin: "2026-04-05" })).toMatch(/après/);
  });

  it("rejects invalid dates", () => {
    expect(validateBookingInput({ ...base, date_debut: "nope" })).toMatch(/invalides/);
  });

  it("accepts a valid nb_animaux and defaults when omitted", () => {
    expect(validateBookingInput({ ...base, nb_animaux: 3 })).toBeNull();
    expect(validateBookingInput({ ...base, nb_animaux: undefined })).toBeNull();
  });

  it("rejects non-positive, fractional or oversized nb_animaux", () => {
    expect(validateBookingInput({ ...base, nb_animaux: 0 })).toMatch(/animaux/);
    expect(validateBookingInput({ ...base, nb_animaux: -2 })).toMatch(/animaux/);
    expect(validateBookingInput({ ...base, nb_animaux: 2.5 })).toMatch(/animaux/);
    expect(validateBookingInput({ ...base, nb_animaux: 9999 })).toMatch(/animaux/);
  });
});
