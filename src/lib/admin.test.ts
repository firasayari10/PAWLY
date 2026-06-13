import { describe, it, expect } from "vitest";
import {
  isAdmin,
  validateSignalementInput,
  signalementResolution,
  canResolveSignalement,
  accountModeration,
  removeFromAverage,
} from "./admin";

describe("isAdmin", () => {
  it("is true only for the admin role", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("prestataire")).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe("validateSignalementInput", () => {
  it("rejects an invalid type", () => {
    expect(validateSignalementInput({ type: "spam", cible_id: "x", motif: "m" })).toMatch(/type/i);
  });

  it("requires a target", () => {
    expect(validateSignalementInput({ type: "avis", motif: "m" })).toMatch(/signalé|manquant/i);
  });

  it("requires a motive", () => {
    expect(validateSignalementInput({ type: "avis", cible_id: "x" })).toMatch(/motif/i);
  });

  it("accepts a valid report", () => {
    expect(validateSignalementInput({ type: "profil", cible_id: "u1", motif: "Comportement abusif" })).toBeNull();
  });
});

describe("signalementResolution / canResolveSignalement", () => {
  it("maps actions to statuses", () => {
    expect(signalementResolution("resoudre")).toEqual({ statut: "resolu" });
    expect(signalementResolution("rejeter")).toEqual({ statut: "rejete" });
  });

  it("errors on an unknown action", () => {
    expect(signalementResolution("ignorer")).toEqual({ error: expect.any(String) });
  });

  it("only allows acting on open reports", () => {
    expect(canResolveSignalement("ouvert")).toBe(true);
    expect(canResolveSignalement("resolu")).toBe(false);
  });
});

describe("accountModeration", () => {
  it("suspends and reactivates", () => {
    expect(accountModeration("suspendre")).toEqual({ statut_compte: "suspendu" });
    expect(accountModeration("reactiver")).toEqual({ statut_compte: "actif" });
  });

  it("errors on an unknown action", () => {
    expect(accountModeration("bannir")).toEqual({ error: expect.any(String) });
  });
});

describe("removeFromAverage", () => {
  it("removes a rating from the running average", () => {
    // (4.5*2 - 5) / 1 = 4
    expect(removeFromAverage(4.5, 2, 5)).toEqual({ note_moyenne: 4, nb_avis: 1 });
  });

  it("resets to zero when removing the last review", () => {
    expect(removeFromAverage(5, 1, 5)).toEqual({ note_moyenne: 0, nb_avis: 0 });
  });

  it("never returns a negative average", () => {
    expect(removeFromAverage(1, 2, 5).note_moyenne).toBeGreaterThanOrEqual(0);
  });
});
