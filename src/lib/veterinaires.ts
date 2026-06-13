// ============================================================
// PAWLY — Vétérinaires domain logic (pure, framework-free, unit-tested)
// ============================================================

import type { MapMarker } from "@/components/map-view";

export interface Clinique {
  id: string;
  nom: string;
  adresse?: string | null;
  ville?: string | null;
  code_postal?: string | null;
  telephone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Map clinics to the marker shape the shared MapView understands. */
export function clinicsToMarkers(clinics: Clinique[]): MapMarker[] {
  return clinics
    .filter((c) => typeof c.latitude === "number" && typeof c.longitude === "number")
    .map((c) => ({
      id: c.id,
      lat: c.latitude as number,
      lng: c.longitude as number,
      label: c.nom,
      sublabel: [c.adresse, c.ville].filter(Boolean).join(", "),
    }));
}

/** Case/accent-insensitive city filter. Empty query returns everything. */
export function filterClinicsByVille(clinics: Clinique[], ville: string): Clinique[] {
  const needle = normalize(ville);
  if (!needle) return clinics;
  return clinics.filter((c) => normalize(c.ville ?? "").includes(needle));
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // Earth radius, km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 100) / 100;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Sort clinics by distance from a reference point (nearest first). */
export function sortByDistance(
  clinics: Clinique[],
  from: { lat: number; lng: number },
): Clinique[] {
  return [...clinics]
    .filter((c) => typeof c.latitude === "number" && typeof c.longitude === "number")
    .sort(
      (x, y) =>
        haversineKm(from, { lat: x.latitude as number, lng: x.longitude as number }) -
        haversineKm(from, { lat: y.latitude as number, lng: y.longitude as number }),
    );
}
