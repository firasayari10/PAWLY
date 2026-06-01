"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { AuthNavbar } from "@/components/auth-navbar";
import { ReviewForm } from "@/components/review-form";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Prestataire {
  id_user: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  photo_profil: string | null;
}

interface Booking {
  id: string;
  type_animal: string;
  nom_animal: string;
  nb_animaux: number;
  date_debut: string;
  date_fin: string;
  message: string;
  statut: string;
  tarif_total: number | null;
  statut_paiement: string | null;
  paid_at: string | null;
  annule_at: string | null;
  created_at: string;
  prestataire: Prestataire | Prestataire[];
  avis: { id: string; note: number }[] | null;
}

interface Veterinaire {
  nom_veterinaire: string;
  nom_clinique: string;
  telephone: string;
  email: string;
  adresse: string;
  notes: string;
}

const EMPTY_VET: Veterinaire = {
  nom_veterinaire: "", nom_clinique: "", telephone: "", email: "", adresse: "", notes: "",
};

const ANIMAL_EMOJI: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰", oiseau: "🐦", rongeur: "🐹", reptile: "🦎",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function getSitter(b: Booking): Prestataire | null {
  if (Array.isArray(b.prestataire)) return b.prestataire[0] ?? null;
  return b.prestataire ?? null;
}

// ── Badges ──────────────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40" },
    accepte: { label: "Acceptée", cls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/40" },
    refuse: { label: "Refusée", cls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40" },
    annule: { label: "Annulée", cls: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" },
  };
  const { label, cls } = map[statut] ?? { label: statut, cls: "bg-zinc-100 text-zinc-500 border-zinc-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function PaiementBadge({ statut }: { statut: string | null }) {
  if (statut === "paye") {
    return <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 dark:border-teal-800/40 dark:bg-teal-900/30 dark:text-teal-400">🔒 Payée</span>;
  }
  if (statut === "rembourse") {
    return <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">Remboursée</span>;
  }
  return null;
}

// ── Vet info form ────────────────────────────────────────────────────────────────

function VetForm() {
  const [vet, setVet] = useState<Veterinaire>(EMPTY_VET);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/veterinaire")
      .then((r) => r.json())
      .then(({ veterinaire }) => { if (veterinaire) setVet({ ...EMPTY_VET, ...veterinaire }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/veterinaire", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vet),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setVet({ ...EMPTY_VET, ...data.veterinaire });
      setFeedback({ ok: true, msg: "Coordonnées vétérinaire enregistrées." });
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof Veterinaire) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setVet((v) => ({ ...v, [k]: e.target.value }));

  const hasVet = vet.nom_veterinaire || vet.nom_clinique || vet.telephone;

  const inputCls =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-xl dark:bg-teal-900/30">🏥</span>
          <div>
            <p className="font-serif text-base font-bold text-zinc-800 dark:text-zinc-100">Coordonnées vétérinaire</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {loading ? "Chargement…" : hasVet ? "Partagées avec vos gardiens en cas d'urgence" : "Ajoutez votre vétérinaire pour les urgences"}
            </p>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && !loading && (
        <form onSubmit={save} className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Nom du vétérinaire</label>
            <input value={vet.nom_veterinaire} onChange={set("nom_veterinaire")} placeholder="Dr. Martin" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Clinique</label>
            <input value={vet.nom_clinique} onChange={set("nom_clinique")} placeholder="Clinique des Lilas" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Téléphone</label>
            <input value={vet.telephone} onChange={set("telephone")} type="tel" placeholder="01 23 45 67 89" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Email</label>
            <input value={vet.email} onChange={set("email")} type="email" placeholder="contact@clinique.fr" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Adresse</label>
            <input value={vet.adresse} onChange={set("adresse")} placeholder="12 rue des Lilas, 75011 Paris" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Notes (traitements, allergies…)</label>
            <textarea value={vet.notes} onChange={set("notes")} rows={2} placeholder="Allergique à certains antibiotiques…" className={`${inputCls} resize-none`} />
          </div>

          {feedback && (
            <div className={`sm:col-span-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${feedback.ok ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-400" : "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"}`}>
              {feedback.ok ? "✓ " : "⚠ "}{feedback.msg}
            </div>
          )}

          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-600">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Booking card ─────────────────────────────────────────────────────────────────

function BookingCard({
  b, onPay, paying, onCancel, cancelling, onReviewed,
}: {
  b: Booking;
  onPay: (id: string) => void;
  paying: boolean;
  onCancel: (id: string) => void;
  cancelling: boolean;
  onReviewed: () => void;
}) {
  const sitter = getSitter(b);
  const initials = sitter ? `${sitter.prenom?.[0] ?? ""}${sitter.nom?.[0] ?? ""}`.toUpperCase() : "?";
  const canPay = b.statut === "accepte" && (b.statut_paiement ?? "non_paye") === "non_paye";
  const canCancel = b.statut === "en_attente" || b.statut === "accepte";
  const isPaid = b.statut === "accepte" && b.statut_paiement === "paye";
  const alreadyReviewed = (b.avis?.length ?? 0) > 0;
  const [showReview, setShowReview] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {sitter?.photo_profil ? (
            <img src={sitter.photo_profil} alt={sitter.prenom} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 font-serif text-sm font-bold text-white">{initials}</div>
          )}
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">{sitter ? `${sitter.prenom} ${sitter.nom}` : "—"}</p>
            {sitter?.email && <p className="text-xs text-zinc-400 dark:text-zinc-500">{sitter.email}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatutBadge statut={b.statut} />
          <PaiementBadge statut={b.statut_paiement} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-700/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Animal</p>
          <p className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{ANIMAL_EMOJI[b.type_animal] ?? "🐾"} {b.nom_animal}</p>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-700/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Début</p>
          <p className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{formatDate(b.date_debut)}</p>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-700/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Fin</p>
          <p className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{formatDate(b.date_fin)}</p>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-700/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Total</p>
          <p className="mt-0.5 font-semibold text-teal-600 dark:text-teal-400">{b.tarif_total != null ? `${b.tarif_total} €` : "—"}</p>
        </div>
      </div>

      {canPay && (
        <button
          onClick={() => onPay(b.id)}
          disabled={paying}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-600"
        >
          {paying ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : "🔒"}
          {paying ? "Redirection vers le paiement…" : `Payer en sécurité — ${b.tarif_total} €`}
        </button>
      )}

      {isPaid && (
        <p className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-center text-sm font-medium text-teal-700 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-400">
          ✓ Réservation confirmée et payée. Bon séjour à {b.nom_animal} !
        </p>
      )}

      {/* Actions row: review (paid bookings) + cancel */}
      {(isPaid && !alreadyReviewed) || canCancel ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {isPaid && !alreadyReviewed && (
            <button
              onClick={() => setShowReview((s) => !s)}
              className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
            >
              ★ Noter le prestataire
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(b.id)}
              disabled={cancelling}
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              {cancelling ? "Annulation…" : isPaid ? "Annuler & être remboursé" : "Annuler"}
            </button>
          )}
        </div>
      ) : null}

      {alreadyReviewed && (
        <p className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400">★ Vous avez noté cette réservation.</p>
      )}

      {showReview && isPaid && !alreadyReviewed && (
        <ReviewForm
          offreId={b.id}
          prestataireName={sitter ? `${sitter.prenom} ${sitter.nom}` : "ce prestataire"}
          onSubmitted={onReviewed}
        />
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setBookings(data.bookings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  // Reflect the Stripe redirect result (success_url / cancel_url) once on mount.
  // On success we also reconcile the payment server-side (retrieve the session
  // from Stripe and fulfil if paid) so the booking confirms even when the
  // webhook listener isn't running.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const offre = params.get("offre");
    if (payment) window.history.replaceState({}, "", "/bookings");

    if (payment === "cancelled") {
      setToast({ ok: false, msg: "Paiement annulé. Vous pouvez réessayer à tout moment." });
      return;
    }
    if (payment === "success") {
      if (!offre) {
        setToast({ ok: true, msg: "Paiement réussi ! Votre réservation est confirmée." });
        return;
      }
      fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offre_id: offre }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.status === "paid" || d?.status === "already_paid") {
            setToast({ ok: true, msg: "Paiement réussi ! Votre réservation est confirmée." });
          } else {
            setToast({ ok: true, msg: "Paiement reçu. Confirmation en cours…" });
          }
        })
        .catch(() => setToast({ ok: true, msg: "Paiement reçu. Confirmation en cours…" }))
        .finally(() => load());
    }
  }, [load]);

  async function handlePay(id: string) {
    setPaying(id);
    setToast(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offre_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Checkout
        return;
      }
      throw new Error("Lien de paiement indisponible.");
    } catch (e) {
      setToast({ ok: false, msg: e instanceof Error ? e.message : "Erreur inconnue" });
      setPaying(null);
    }
  }

  async function handleCancel(id: string) {
    const booking = bookings.find((b) => b.id === id);
    const willRefund = booking?.statut === "accepte" && booking?.statut_paiement === "paye";
    const message = willRefund
      ? "Annuler cette réservation ? Votre paiement sera intégralement remboursé."
      : "Annuler cette réservation ?";
    if (!window.confirm(message)) return;

    setCancelling(id);
    setToast(null);
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setToast({
        ok: true,
        msg: data.refunded
          ? "Réservation annulée et paiement remboursé."
          : "Réservation annulée.",
      });
      await load();
    } catch (e) {
      setToast({ ok: false, msg: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally {
      setCancelling(null);
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  const aPayer = bookings.filter((b) => b.statut === "accepte" && (b.statut_paiement ?? "non_paye") === "non_paye").length;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <AuthNavbar />

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-28">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-black text-zinc-800 dark:text-zinc-100">Mes réservations</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Suivez vos demandes de garde, payez en sécurité et gérez vos informations.
            </p>
          </div>
          <Link
            href="/bookings/history"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-teal-500 dark:hover:text-teal-400"
          >
            🕑 Historique
          </Link>
        </div>

        {toast && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${toast.ok ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-400" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400"}`}>
            <span>{toast.ok ? "✓" : "⚠"}</span>
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-auto text-current opacity-60 hover:opacity-100" aria-label="Fermer">×</button>
          </div>
        )}

        {/* Vet info */}
        <div className="mb-6">
          <VetForm />
        </div>

        {aPayer > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
            💳 {aPayer} réservation{aPayer > 1 ? "s" : ""} acceptée{aPayer > 1 ? "s" : ""} en attente de paiement.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}

        {loading && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-5xl">📭</span>
            <p className="font-serif text-lg font-bold text-zinc-700 dark:text-zinc-300">Aucune réservation pour le moment</p>
            <p className="max-w-xs text-sm text-zinc-400">Trouvez un gardien et envoyez votre première demande de garde.</p>
            <Link href="/search" className="mt-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
              Trouver un gardien
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              b={b}
              onPay={handlePay}
              paying={paying === b.id}
              onCancel={handleCancel}
              cancelling={cancelling === b.id}
              onReviewed={() => { setToast({ ok: true, msg: "Merci ! Votre avis a été publié." }); load(); }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
