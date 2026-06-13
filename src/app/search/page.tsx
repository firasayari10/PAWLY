"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { MapPin, Search, X } from "lucide-react";
import { AuthNavbar } from "@/components/auth-navbar";
import { AnimalIcon } from "@/components/icons";
import type { MapMarker } from "@/components/map-view";

// Leaflet must be client-only
const MapView = dynamic(() => import("@/components/map-view"), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────────

interface Profil {
  id: string;
  bio: string;
  tarif_jour: number;
  types_animaux: string[];
  rayon_km: number;
  annees_experience: number;
  note_moyenne: number;
  nb_avis: number;
  disponible: boolean;
}

interface Prestataire {
  id_user: string;
  prenom: string;
  nom: string;
  ville: string;
  code_postal: string;
  latitude: number;
  longitude: number;
  photo_profil: string;
  profil: Profil;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ANIMAL_OPTIONS = [
  { value: "",         label: "Tous les animaux" },
  { value: "chien",    label: "Chien" },
  { value: "chat",     label: "Chat" },
  { value: "lapin",    label: "Lapin" },
  { value: "oiseau",   label: "Oiseau" },
  { value: "rongeur",  label: "Rongeur" },
  { value: "reptile",  label: "Reptile" },
];

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ note, size = 14 }: { note: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < Math.round(note) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

// ── Prestataire card ──────────────────────────────────────────────────────────

function PrestaireCard({ p, highlighted, onHover }: { p: Prestataire; highlighted: boolean; onHover: (id: string | null) => void }) {
  const initials = `${p.prenom?.[0] ?? ""}${p.nom?.[0] ?? ""}`.toUpperCase();
  return (
    <Link
      href={`/prestataires/${p.id_user}`}
      onMouseEnter={() => onHover(p.id_user)}
      onMouseLeave={() => onHover(null)}
      className={`group flex gap-4 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        highlighted
          ? "border-teal-400 bg-teal-50 shadow-md dark:border-teal-600 dark:bg-teal-900/20"
          : "border-zinc-200 bg-white dark:border-zinc-700/60 dark:bg-zinc-800"
      }`}
    >
      {/* Avatar */}
      {p.photo_profil ? (
        <img src={p.photo_profil} alt={p.prenom} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 font-serif text-xl font-bold text-white">
          {initials || "?"}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-serif text-base font-bold text-zinc-800 group-hover:text-teal-700 dark:text-zinc-100 dark:group-hover:text-teal-400">
              {p.prenom} {p.nom}
            </p>
            <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {p.ville} {p.code_postal}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold text-teal-600 dark:text-teal-400">{p.profil.tarif_jour} €</p>
            <p className="text-[10px] text-zinc-400">/jour</p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Stars note={p.profil.note_moyenne} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {p.profil.note_moyenne > 0
              ? `${p.profil.note_moyenne.toFixed(1)} (${p.profil.nb_avis} avis)`
              : "Nouveau prestataire"}
          </span>
        </div>

        {p.profil.types_animaux.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.profil.types_animaux.slice(0, 4).map((a) => (
              <span key={a} className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-500 dark:bg-orange-900/20 dark:text-orange-400">
                <AnimalIcon type={a} className="h-3 w-3" /> {a}
              </span>
            ))}
          </div>
        )}

        {p.profil.bio && (
          <p className="mt-2 line-clamp-1 text-xs text-zinc-400">{p.profil.bio}</p>
        )}
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const { isLoaded, isSignedIn } = useAuth();

  // Filters
  const [ville,       setVille]      = useState("");
  const [typeAnimal,  setTypeAnimal] = useState("");
  const [tarifMax,    setTarifMax]   = useState("");

  // Results
  const [results,  setResults]  = useState<Prestataire[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // UX
  const [mobileTab,    setMobileTab]    = useState<"list" | "map">("list");
  const [highlighted,  setHighlighted]  = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (v: string, ta: string, tm: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (v)  params.set("ville", v);
      if (ta) params.set("type_animal", ta);
      if (tm) params.set("tarif_max", tm);
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setResults(data.results ?? []);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load with no filters
  useEffect(() => {
    if (isLoaded && isSignedIn) doSearch("", "", "");
  }, [isLoaded, isSignedIn, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(ville, typeAnimal, tarifMax);
  };

  const markers: MapMarker[] = results.map((p) => ({
    id:       p.id_user,
    lat:      p.latitude,
    lng:      p.longitude,
    label:    `${p.prenom} ${p.nom}`,
    sublabel: p.ville,
    tarif:    p.profil.tarif_jour,
  }));

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="flex h-screen flex-col bg-zinc-50 font-sans dark:bg-zinc-900">
      <AuthNavbar />

      {/* ── FILTER BAR ──────────────────────────────────────────────────── */}
      <div className="mt-[65px] border-b border-zinc-200/60 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-zinc-800/60 dark:bg-zinc-950/90">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-5xl flex-wrap items-end gap-3">
          {/* Ville */}
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Ville</label>
            <div className="relative">
              <input
                ref={inputRef}
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                placeholder="Paris, Lyon, Bordeaux…"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              {ville && (
                <button
                  type="button"
                  onClick={() => setVille("")}
                  aria-label="Effacer la ville"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>

          {/* Type animal */}
          <div className="flex min-w-[160px] flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Animal</label>
            <select
              value={typeAnimal}
              onChange={(e) => setTypeAnimal(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {ANIMAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Tarif max */}
          <div className="flex min-w-[140px] flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Budget max{tarifMax ? ` — ${tarifMax} €/j` : ""}
            </label>
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={tarifMax || 150}
              onChange={(e) => setTarifMax(e.target.value === "150" ? "" : e.target.value)}
              className="h-2.5 w-full cursor-pointer accent-teal-600"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            )}
            Rechercher
          </button>
        </form>
      </div>

      {/* ── MOBILE TABS ─────────────────────────────────────────────────── */}
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
            {tab === "list" ? `Liste (${results.length})` : "Carte"}
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── LIST PANEL ────────────────────────────────────────── */}
        <div className={`flex flex-col overflow-y-auto lg:w-[420px] lg:shrink-0 ${mobileTab === "map" ? "hidden lg:flex" : "flex w-full"}`}>
          <div className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 px-4 py-2.5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {loading
                ? "Recherche en cours…"
                : searched
                  ? `${results.length} prestataire${results.length !== 1 ? "s" : ""} trouvé${results.length !== 1 ? "s" : ""}`
                  : "Entrez une ville pour commencer"}
            </p>
          </div>

          <div className="flex-1 space-y-3 p-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {loading && results.length === 0 && (
              <div className="flex flex-col gap-3 pt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
                ))}
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Search className="h-12 w-12 text-zinc-300 dark:text-zinc-600" aria-hidden />
                <p className="font-serif text-lg font-bold text-zinc-700 dark:text-zinc-300">Aucun prestataire trouvé</p>
                <p className="max-w-xs text-sm text-zinc-400">
                  Essayez avec une ville différente ou élargissez vos critères.
                </p>
                <button
                  onClick={() => { setVille(""); setTypeAnimal(""); setTarifMax(""); doSearch("", "", ""); }}
                  className="mt-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-400"
                >
                  Voir tous les prestataires
                </button>
              </div>
            )}

            {results.map((p) => (
              <PrestaireCard
                key={p.id_user}
                p={p}
                highlighted={highlighted === p.id_user}
                onHover={setHighlighted}
              />
            ))}
          </div>
        </div>

        {/* ── MAP PANEL ─────────────────────────────────────────── */}
        <div className={`flex-1 p-3 ${mobileTab === "list" ? "hidden lg:block" : "block"}`}>
          <div className="h-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <MapView
              markers={markers}
              onMarkerClick={(id) => setHighlighted(id)}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
