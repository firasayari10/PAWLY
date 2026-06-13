import { describe, it, expect } from "vitest";
import {
  clinicsToMarkers,
  filterClinicsByVille,
  haversineKm,
  sortByDistance,
  type Clinique,
} from "./veterinaires";

const PARIS: Clinique = {
  id: "c1", nom: "Vét Paris", adresse: "12 rue X", ville: "Paris",
  latitude: 48.86, longitude: 2.35,
};
const LYON: Clinique = {
  id: "c2", nom: "Vét Lyon", adresse: "8 bd Y", ville: "Lyon",
  latitude: 45.77, longitude: 4.83,
};
const NO_COORDS: Clinique = { id: "c3", nom: "Vét Fantôme", ville: "Nulle", latitude: null, longitude: null };

describe("clinicsToMarkers", () => {
  it("maps clinics with coordinates to markers", () => {
    const markers = clinicsToMarkers([PARIS, LYON]);
    expect(markers).toHaveLength(2);
    expect(markers[0]).toMatchObject({ id: "c1", lat: 48.86, lng: 2.35, label: "Vét Paris" });
    expect(markers[0].sublabel).toBe("12 rue X, Paris");
  });

  it("drops clinics without coordinates", () => {
    expect(clinicsToMarkers([PARIS, NO_COORDS])).toHaveLength(1);
  });
});

describe("filterClinicsByVille", () => {
  it("returns all clinics for an empty query", () => {
    expect(filterClinicsByVille([PARIS, LYON], "")).toHaveLength(2);
  });

  it("matches case- and accent-insensitively", () => {
    const r = filterClinicsByVille([PARIS, LYON], "  PÀRIS ");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("c1");
  });

  it("returns nothing for an unknown city", () => {
    expect(filterClinicsByVille([PARIS, LYON], "Berlin")).toHaveLength(0);
  });
});

describe("haversineKm", () => {
  it("is ~0 for the same point", () => {
    expect(haversineKm({ lat: 48.86, lng: 2.35 }, { lat: 48.86, lng: 2.35 })).toBe(0);
  });

  it("approximates the Paris↔Lyon distance (~390 km)", () => {
    const d = haversineKm({ lat: 48.86, lng: 2.35 }, { lat: 45.77, lng: 4.83 });
    expect(d).toBeGreaterThan(380);
    expect(d).toBeLessThan(400);
  });
});

describe("sortByDistance", () => {
  it("orders clinics nearest-first from a reference point", () => {
    const sorted = sortByDistance([LYON, PARIS], { lat: 48.9, lng: 2.3 });
    expect(sorted.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("drops clinics without coordinates", () => {
    const sorted = sortByDistance([PARIS, NO_COORDS], { lat: 48.9, lng: 2.3 });
    expect(sorted).toHaveLength(1);
  });
});
