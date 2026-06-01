import { describe, it, expect } from "vitest";
import { cancellationPolicy } from "./cancellation";

const NOW = new Date("2026-04-15T12:00:00Z");
const FUTURE = "2026-04-20";
const PAST = "2026-04-10";
const TODAY = "2026-04-15";

describe("cancellationPolicy", () => {
  it("refuses an already cancelled booking", () => {
    const d = cancellationPolicy({ statut: "annule", statut_paiement: "rembourse", date_debut: FUTURE }, NOW);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/déjà terminée/);
  });

  it("refuses an already refused booking", () => {
    const d = cancellationPolicy({ statut: "refuse", statut_paiement: "non_paye", date_debut: FUTURE }, NOW);
    expect(d.allowed).toBe(false);
  });

  it("allows a full refund for a paid booking before it starts", () => {
    const d = cancellationPolicy({ statut: "accepte", statut_paiement: "paye", date_debut: FUTURE }, NOW);
    expect(d).toMatchObject({ allowed: true, refund: "full", newStatut: "annule", newPaiement: "rembourse" });
  });

  it("blocks cancelling a paid booking once the stay has started", () => {
    const d = cancellationPolicy({ statut: "accepte", statut_paiement: "paye", date_debut: PAST }, NOW);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/déjà commencé/);
  });

  it("treats a stay starting today as already started for paid bookings", () => {
    const d = cancellationPolicy({ statut: "accepte", statut_paiement: "paye", date_debut: TODAY }, NOW);
    expect(d.allowed).toBe(false);
  });

  it("allows cancelling a pending (unpaid) booking with no refund", () => {
    const d = cancellationPolicy({ statut: "en_attente", statut_paiement: "non_paye", date_debut: FUTURE }, NOW);
    expect(d).toMatchObject({ allowed: true, refund: "none", newStatut: "annule", newPaiement: "non_paye" });
  });

  it("allows cancelling an accepted-but-unpaid booking with no refund", () => {
    const d = cancellationPolicy({ statut: "accepte", statut_paiement: "non_paye", date_debut: FUTURE }, NOW);
    expect(d).toMatchObject({ allowed: true, refund: "none", newStatut: "annule" });
  });
});
