"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { Check, House, Inbox, Lock, MessageCircle, NotebookPen, Stethoscope, TriangleAlert, X } from "lucide-react";
import { AuthNavbar } from "@/components/auth-navbar";
import { AnimalIcon } from "@/components/icons";
import { ChatBox } from "@/components/chat-box";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Proprietaire {
  id_user:     string;
  prenom:      string;
  nom:         string;
  email:       string;
  telephone:   string | null;
  photo_profil: string | null;
}

interface Veterinaire {
  nom_veterinaire: string;
  nom_clinique:    string;
  telephone:       string;
  email:           string;
  adresse:         string;
  notes:           string;
}

interface Offre {
  id:              string;
  type_animal:     string;
  nom_animal:      string;
  nb_animaux:      number;
  date_debut:      string;
  date_fin:        string;
  message:         string;
  statut:          string;
  tarif_total:     number | null;
  statut_paiement: string | null;
  paid_at:         string | null;
  created_at:      string;
  proprietaire:    Proprietaire | Proprietaire[];
  veterinaire?:    Veterinaire | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function nbJours(debut: string, fin: string) {
  return Math.max(1, Math.ceil((new Date(fin).getTime() - new Date(debut).getTime()) / 86_400_000));
}

function getOwner(offre: Offre): Proprietaire | null {
  if (Array.isArray(offre.proprietaire)) return offre.proprietaire[0] ?? null;
  return offre.proprietaire ?? null;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    en_attente: {
      label: "En attente",
      cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40",
    },
    accepte: {
      label: "Acceptée",
      cls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/40",
    },
    refuse: {
      label: "Refusée",
      cls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40",
    },
    annule: {
      label: "Annulée",
      cls: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    },
  };
  const { label, cls } = map[statut] ?? { label: statut, cls: "bg-zinc-100 text-zinc-500 border-zinc-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

const TABS = [
  { key: "all",        label: "Toutes" },
  { key: "en_attente", label: "En attente" },
  { key: "accepte",    label: "Acceptées" },
  { key: "refuse",     label: "Refusées" },
] as const;

// ── Offre card ────────────────────────────────────────────────────────────────

function OffreCard({
  offre,
  onAction,
  processing,
}: {
  offre: Offre;
  onAction: (id: string, action: "accepter" | "refuser") => void;
  processing: boolean;
}) {
  const owner   = getOwner(offre);
  const jours   = nbJours(offre.date_debut, offre.date_fin);
  const initials = owner ? `${owner.prenom?.[0] ?? ""}${owner.nom?.[0] ?? ""}`.toUpperCase() : "?";
  const router  = useRouter();
  const [openingJournal, setOpeningJournal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  async function openJournal() {
    setOpeningJournal(true);
    try {
      const res = await fetch("/api/journal/from-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offre_id: offre.id }),
      });
      const data = await res.json();
      if (res.ok && data.journal?.id) {
        router.push(`/journal/${data.journal.id}?offre=${offre.id}`);
      }
    } finally {
      setOpeningJournal(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-800">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Owner avatar */}
          {owner?.photo_profil ? (
            <img src={owner.photo_profil} alt={owner.prenom} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-400 to-zinc-500 font-serif text-sm font-bold text-white dark:from-zinc-600 dark:to-zinc-700">
              {initials}
            </div>
          )}
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">
              {owner ? `${owner.prenom} ${owner.nom}` : "—"}
            </p>
            {owner?.email && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{owner.email}</p>
            )}
            {owner?.telephone && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{owner.telephone}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatutBadge statut={offre.statut} />
          {offre.statut === "accepte" && offre.statut_paiement === "paye" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 dark:border-teal-800/40 dark:bg-teal-900/30 dark:text-teal-400">
              <Lock className="h-3 w-3" aria-hidden /> Payée
            </span>
          )}
          {offre.statut === "accepte" && (offre.statut_paiement ?? "non_paye") === "non_paye" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-400">
              Paiement en attente
            </span>
          )}
        </div>
      </div>

      {/* Animal + dates */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-700/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Animal</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-100">
            <AnimalIcon type={offre.type_animal} className="h-4 w-4 text-teal-600 dark:text-teal-400" /> {offre.nom_animal}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{offre.nb_animaux} animal(aux)</p>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-700/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Début</p>
          <p className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{formatDate(offre.date_debut)}</p>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-700/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Fin</p>
          <p className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{formatDate(offre.date_fin)}</p>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-700/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Tarif</p>
          <p className="mt-0.5 font-semibold text-teal-600 dark:text-teal-400">
            {offre.tarif_total != null ? `${offre.tarif_total} €` : "—"}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{jours} jour{jours > 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Message */}
      {offre.message && (
        <p className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-700/30 dark:text-zinc-300">
          &ldquo;{offre.message}&rdquo;
        </p>
      )}

      {/* Vet info — visible to the sitter once they've accepted the booking */}
      {offre.statut === "accepte" && offre.veterinaire &&
        (offre.veterinaire.nom_veterinaire || offre.veterinaire.nom_clinique || offre.veterinaire.telephone) && (
        <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/60 p-4 dark:border-teal-800/40 dark:bg-teal-900/15">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
            <Stethoscope className="h-4 w-4" aria-hidden /> Vétérinaire de l&apos;animal
          </p>
          <div className="grid gap-x-4 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
            {offre.veterinaire.nom_veterinaire && <p><span className="text-zinc-400">Praticien : </span>{offre.veterinaire.nom_veterinaire}</p>}
            {offre.veterinaire.nom_clinique && <p><span className="text-zinc-400">Clinique : </span>{offre.veterinaire.nom_clinique}</p>}
            {offre.veterinaire.telephone && <p><span className="text-zinc-400">Tél : </span><a href={`tel:${offre.veterinaire.telephone}`} className="font-medium text-teal-600 hover:underline dark:text-teal-400">{offre.veterinaire.telephone}</a></p>}
            {offre.veterinaire.email && <p className="truncate"><span className="text-zinc-400">Email : </span>{offre.veterinaire.email}</p>}
            {offre.veterinaire.adresse && <p className="sm:col-span-2"><span className="text-zinc-400">Adresse : </span>{offre.veterinaire.adresse}</p>}
            {offre.veterinaire.notes && <p className="sm:col-span-2"><span className="text-zinc-400">Notes : </span>{offre.veterinaire.notes}</p>}
          </div>
        </div>
      )}

      {/* Journal — share daily updates with the owner once the garde is accepted */}
      {offre.statut === "accepte" && (
        <button
          onClick={openJournal}
          disabled={openingJournal}
          className="mt-4 w-full rounded-xl border border-teal-200 bg-teal-50/60 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-800/40 dark:bg-teal-900/15 dark:text-teal-400"
        >
          {openingJournal ? (
            "…"
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <NotebookPen className="h-4 w-4" aria-hidden /> Journal de {offre.nom_animal}
            </span>
          )}
        </button>
      )}

      {/* Chat — end-to-end-encrypted, available once the garde is accepted */}
      {offre.statut === "accepte" && (
        <button
          onClick={() => setShowChat((s) => !s)}
          className="mt-3 w-full rounded-xl border border-teal-300 bg-teal-50 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-700/50 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/30"
        >
          <span className="flex items-center justify-center gap-1.5">
            <MessageCircle className="h-4 w-4" aria-hidden />
            {showChat ? "Masquer la discussion" : `Discuter avec ${owner?.prenom ?? "le propriétaire"}`}
          </span>
        </button>
      )}

      {showChat && offre.statut === "accepte" && (
        <ChatBox
          offreId={offre.id}
          peerName={owner ? `${owner.prenom} ${owner.nom}` : undefined}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Actions — only for pending */}
      {offre.statut === "en_attente" && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => onAction(offre.id, "accepter")}
            disabled={processing}
            className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            {processing ? (
              "…"
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" aria-hidden /> Accepter
              </span>
            )}
          </button>
          <button
            onClick={() => onAction(offre.id, "refuser")}
            disabled={processing}
            className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            {processing ? (
              "…"
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <X className="h-4 w-4" aria-hidden /> Refuser
              </span>
            )}
          </button>
        </div>
      )}

      <p className="mt-3 text-right text-[10px] text-zinc-400 dark:text-zinc-500">
        Reçue le {formatDate(offre.created_at)}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [offres,     setOffres]     = useState<Offre[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [filter,     setFilter]     = useState<string>("all");
  const [processing, setProcessing] = useState<string | null>(null); // id of the offer being processed
  const [toast,      setToast]      = useState<{ ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/dashboard");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setOffres(data.offres ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  async function handleAction(id: string, action: "accepter" | "refuser") {
    setProcessing(id);
    setToast(null);
    try {
      const res  = await fetch(`/api/dashboard/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");

      // Optimistic update
      setOffres((prev) =>
        prev.map((o) => (o.id === id ? { ...o, statut: data.statut } : o)),
      );
      setToast({
        ok:  true,
        msg: action === "accepter"
          ? "Demande acceptée — un email a été envoyé au propriétaire."
          : "Demande refusée — un email a été envoyé au propriétaire.",
      });
    } catch (e) {
      setToast({ ok: false, msg: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally {
      setProcessing(null);
    }
  }

  const filtered = filter === "all" ? offres : offres.filter((o) => o.statut === filter);
  const counts   = {
    all:        offres.length,
    en_attente: offres.filter((o) => o.statut === "en_attente").length,
    accepte:    offres.filter((o) => o.statut === "accepte").length,
    refuse:     offres.filter((o) => o.statut === "refuse").length,
  };

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <AuthNavbar />

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-28">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-black text-zinc-800 dark:text-zinc-100">
            Dashboard prestataire
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Gérez vos demandes de garde et répondez aux propriétaires.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium
            ${toast.ok
              ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-400"
              : "border-red-200 bg-red-50 text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
            }`}>
            {toast.ok ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />}
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} aria-label="Fermer" className="ml-auto text-current opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}

        {/* Not a prestataire */}
        {error?.includes("prestataire") && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white py-16 text-center dark:border-zinc-700/60 dark:bg-zinc-800">
            <House className="h-12 w-12 text-zinc-300 dark:text-zinc-600" aria-hidden />
            <p className="font-serif text-xl font-bold text-zinc-700 dark:text-zinc-200">
              Accès réservé aux prestataires
            </p>
            <p className="max-w-xs text-sm text-zinc-400">
              Vous devez avoir le rôle &laquo; Prestataire &raquo; pour accéder à ce dashboard.
            </p>
            <Link
              href="/profile"
              className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Modifier mon profil
            </Link>
          </div>
        )}

        {/* Generic error */}
        {error && !error.includes("prestataire") && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {!error && (
          <>
            {/* Stats row */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {[
                { label: "En attente", count: counts.en_attente, cls: "text-amber-600 dark:text-amber-400" },
                { label: "Acceptées",  count: counts.accepte,    cls: "text-teal-600 dark:text-teal-400" },
                { label: "Refusées",   count: counts.refuse,     cls: "text-red-500 dark:text-red-400" },
              ].map(({ label, count, cls }) => (
                <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-700/60 dark:bg-zinc-800">
                  <p className={`font-serif text-2xl font-black ${cls}`}>{count}</p>
                  <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="mb-5 flex gap-2 overflow-x-auto">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition
                    ${filter === key
                      ? "bg-teal-600 text-white dark:bg-teal-500"
                      : "border border-zinc-200 text-zinc-600 hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-400"
                    }`}
                >
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filter === key ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-700"}`}>
                    {counts[key as keyof typeof counts]}
                  </span>
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <Inbox className="h-12 w-12 text-zinc-300 dark:text-zinc-600" aria-hidden />
                <p className="font-serif text-lg font-bold text-zinc-700 dark:text-zinc-300">
                  {filter === "all" ? "Aucune demande reçue" : "Aucune demande dans cette catégorie"}
                </p>
                <p className="max-w-xs text-sm text-zinc-400">
                  {filter === "all"
                    ? "Les propriétaires peuvent vous envoyer des demandes depuis votre fiche prestataire."
                    : "Changez de filtre pour voir les autres demandes."}
                </p>
              </div>
            )}

            {/* List */}
            <div className="flex flex-col gap-4">
              {filtered.map((offre) => (
                <OffreCard
                  key={offre.id}
                  offre={offre}
                  onAction={handleAction}
                  processing={processing === offre.id}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
