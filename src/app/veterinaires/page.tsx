"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { MapPin, Phone, Stethoscope } from "lucide-react";
import { AuthNavbar } from "@/components/auth-navbar";
import { clinicsToMarkers, type Clinique } from "@/lib/veterinaires";

// Leaflet must be client-only
const MapView = dynamic(() => import("@/components/map-view"), { ssr: false });

export default function VeterinairesPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [ville, setVille] = useState("");
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");

  const load = useCallback(async (v: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (v) params.set("ville", v);
      const res = await fetch(`/api/veterinaires?${params}`);
      const data = await res.json();
      if (res.ok) setCliniques(data.cliniques ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) load("");
  }, [isLoaded, isSignedIn, load]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  const markers = clinicsToMarkers(cliniques);

  return (
    <div className="flex h-screen flex-col bg-zinc-50 font-sans dark:bg-zinc-900">
      <AuthNavbar />

      <div className="mt-[65px] border-b border-zinc-200/60 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-zinc-800/60 dark:bg-zinc-950/90">
        <form
          onSubmit={(e) => { e.preventDefault(); load(ville); }}
          className="mx-auto flex max-w-5xl items-end gap-3"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Ville</label>
            <input
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              placeholder="Paris, Lyon, Marseille…"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button type="submit" className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
            Filtrer
          </button>
        </form>
      </div>

      {/* Mobile tabs */}
      <div className="flex border-b border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-950 lg:hidden">
        {(["list", "map"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${
              mobileTab === tab
                ? "border-b-2 border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {tab === "list" ? `Liste (${cliniques.length})` : "Carte"}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* List */}
        <div className={`flex flex-col overflow-y-auto lg:w-[420px] lg:shrink-0 ${mobileTab === "map" ? "hidden lg:flex" : "flex w-full"}`}>
          <div className="flex-1 space-y-3 p-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
              ))
            ) : cliniques.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">Aucune clinique trouvée.</p>
            ) : (
              cliniques.map((c) => (
                <div
                  key={c.id}
                  onMouseEnter={() => setHighlighted(c.id)}
                  onMouseLeave={() => setHighlighted(null)}
                  className={`rounded-2xl border p-4 transition ${
                    highlighted === c.id
                      ? "border-teal-400 bg-teal-50 dark:border-teal-600 dark:bg-teal-900/20"
                      : "border-zinc-200 bg-white dark:border-zinc-700/60 dark:bg-zinc-800"
                  }`}
                >
                  <p className="flex items-center gap-1.5 font-serif text-base font-bold text-zinc-800 dark:text-zinc-100">
                    <Stethoscope className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden /> {c.nom}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {c.adresse}, {c.code_postal} {c.ville}
                  </p>
                  {c.telephone && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                      <Phone className="h-3 w-3 shrink-0" aria-hidden /> {c.telephone}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div className={`flex-1 p-3 ${mobileTab === "list" ? "hidden lg:block" : "block"}`}>
          <div className="h-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <MapView markers={markers} onMarkerClick={(idv) => setHighlighted(idv)} />
          </div>
        </div>
      </div>
    </div>
  );
}
