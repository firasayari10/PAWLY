"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { AuthNavbar } from "@/components/auth-navbar";
import { ReviewForm, StarsReadonly } from "@/components/review-form";

interface Prestataire {
  id_user: string;
  prenom: string;
  nom: string;
  email: string;
  photo_profil: string | null;
}

interface HistoryBooking {
  id: string;
  type_animal: string;
  nom_animal: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  tarif_total: number | null;
  statut_paiement: string | null;
  annule_at: string | null;
  prestataire: Prestataire | Prestataire[];
  avis: { id: string; note: number; commentaire: string }[] | null;
}

const ANIMAL_EMOJI: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰", oiseau: "🐦", rongeur: "🐹", reptile: "🦎",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function getSitter(b: HistoryBooking): Prestataire | null {
  if (Array.isArray(b.prestataire)) return b.prestataire[0] ?? null;
  return b.prestataire ?? null;
}

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    accepte: { label: "Terminée", cls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/40" },
    refuse: { label: "Refusée", cls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40" },
    annule: { label: "Annulée", cls: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" },
    en_attente: { label: "Expirée", cls: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" },
  };
  const { label, cls } = map[statut] ?? { label: statut, cls: "bg-zinc-100 text-zinc-500 border-zinc-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function HistoryCard({ b, onReviewed }: { b: HistoryBooking; onReviewed: () => void }) {
  const sitter = getSitter(b);
  const initials = sitter ? `${sitter.prenom?.[0] ?? ""}${sitter.nom?.[0] ?? ""}`.toUpperCase() : "?";
  const review = b.avis?.[0] ?? null;
  const completedPaid = b.statut === "accepte" && b.statut_paiement === "paye";
  const [showReview, setShowReview] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {sitter?.photo_profil ? (
            <img src={sitter.photo_profil} alt={sitter.prenom} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-400 to-zinc-500 font-serif text-sm font-bold text-white">{initials}</div>
          )}
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">{sitter ? `${sitter.prenom} ${sitter.nom}` : "—"}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {ANIMAL_EMOJI[b.type_animal] ?? "🐾"} {b.nom_animal} · {formatDate(b.date_debut)} → {formatDate(b.date_fin)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatutBadge statut={b.statut} />
          {b.tarif_total != null && <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">{b.tarif_total} €</span>}
        </div>
      </div>

      {/* Existing review */}
      {review && (
        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-800/30 dark:bg-amber-900/10">
          <div className="flex items-center gap-2">
            <StarsReadonly note={review.note} />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Votre avis</span>
          </div>
          {review.commentaire && <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300">&ldquo;{review.commentaire}&rdquo;</p>}
        </div>
      )}

      {/* Rate a completed, unreviewed stay */}
      {completedPaid && !review && (
        <>
          <button
            onClick={() => setShowReview((s) => !s)}
            className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
          >
            ★ Noter ce séjour
          </button>
          {showReview && (
            <ReviewForm
              offreId={b.id}
              prestataireName={sitter ? `${sitter.prenom} ${sitter.nom}` : "ce prestataire"}
              onSubmitted={onReviewed}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [items, setItems] = useState<HistoryBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/history");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setItems(data.history ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <AuthNavbar />

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-28">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-black text-zinc-800 dark:text-zinc-100">Historique des réservations</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Vos gardes passées, refusées et annulées. Notez vos prestataires.
            </p>
          </div>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-teal-500 dark:hover:text-teal-400"
          >
            ← Réservations en cours
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}

        {loading && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-5xl">🕑</span>
            <p className="font-serif text-lg font-bold text-zinc-700 dark:text-zinc-300">Aucun historique pour le moment</p>
            <p className="max-w-xs text-sm text-zinc-400">Vos réservations terminées apparaîtront ici.</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {items.map((b) => (
            <HistoryCard key={b.id} b={b} onReviewed={load} />
          ))}
        </div>
      </main>
    </div>
  );
}
