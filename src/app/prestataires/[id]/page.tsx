"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { CalendarDays, Check, CircleCheck, MapPin, PawPrint, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";
import { AuthNavbar } from "@/components/auth-navbar";
import { AnimalIcon } from "@/components/icons";
import { StarsReadonly } from "@/components/review-form";
import { ReportButton } from "@/components/report-button";

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
  adresse: string;
  latitude: number;
  longitude: number;
  photo_profil: string;
  statut_compte: string;
  profil: Profil | null;
}

interface Avis {
  id: string;
  note: number;
  commentaire: string;
  created_at: string;
  auteur: { prenom: string; nom: string } | { prenom: string; nom: string }[] | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ANIMAL_OPTIONS = [
  { value: "chien",   label: "Chien" },
  { value: "chat",    label: "Chat" },
  { value: "lapin",   label: "Lapin" },
  { value: "oiseau",  label: "Oiseau" },
  { value: "rongeur", label: "Rongeur" },
  { value: "reptile", label: "Reptile" },
];

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ note }: { note: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24"
          fill={i < Math.round(note) ? "currentColor" : "none"}
          stroke="currentColor" strokeWidth={1.5}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

// ── Offer form ────────────────────────────────────────────────────────────────

function OfferForm({ prestataire }: { prestataire: Prestataire }) {
  const router = useRouter();
  const [typeAnimal,  setTypeAnimal]  = useState("chien");
  const [nomAnimal,   setNomAnimal]   = useState("");
  const [nbAnimaux,   setNbAnimaux]   = useState(1);
  const [dateDebut,   setDateDebut]   = useState("");
  const [dateFin,     setDateFin]     = useState("");
  const [message,     setMessage]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [feedback,    setFeedback]    = useState<{ ok: boolean; msg: string } | null>(null);

  const tarif = prestataire.profil?.tarif_jour ?? 0;
  const nbJours =
    dateDebut && dateFin
      ? Math.max(0, Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000))
      : 0;
  const total = nbJours * tarif;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateDebut || !dateFin) return setFeedback({ ok: false, msg: "Veuillez saisir les dates." });
    if (new Date(dateFin) <= new Date(dateDebut)) return setFeedback({ ok: false, msg: "La date de fin doit être après la date de début." });
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prestataire_id: prestataire.id_user,
          type_animal: typeAnimal,
          nom_animal: nomAnimal,
          nb_animaux: nbAnimaux,
          date_debut: dateDebut,
          date_fin: dateFin,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error ?? "Erreur inconnue." });
      } else {
        setFeedback({ ok: true, msg: "Demande envoyée ! Le prestataire va vous répondre prochainement." });
        setTimeout(() => router.push("/landing"), 2500);
      }
    } catch {
      setFeedback({ ok: false, msg: "Erreur réseau. Réessayez." });
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-800">
      <h3 className="mb-5 font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">
        Envoyer une demande de garde
      </h3>

      {/* Animal type */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Type d&apos;animal
        </label>
        <select
          value={typeAnimal}
          onChange={(e) => setTypeAnimal(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
        >
          {ANIMAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Animal name */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Nom de l&apos;animal <span className="text-red-400">*</span>
        </label>
        <input
          required
          value={nomAnimal}
          onChange={(e) => setNomAnimal(e.target.value)}
          placeholder="Ex: Rex, Mochi, Caramel…"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
        />
      </div>

      {/* Nb animaux */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Nombre d&apos;animaux
        </label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setNbAnimaux(Math.max(1, nbAnimaux - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:border-teal-400 dark:border-zinc-600 dark:text-zinc-300">
            −
          </button>
          <span className="w-8 text-center font-semibold text-zinc-800 dark:text-zinc-100">{nbAnimaux}</span>
          <button type="button" onClick={() => setNbAnimaux(Math.min(10, nbAnimaux + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:border-teal-400 dark:border-zinc-600 dark:text-zinc-300">
            +
          </button>
        </div>
      </div>

      {/* Dates */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Arrivée <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            required
            min={today}
            value={dateDebut}
            onChange={(e) => { setDateDebut(e.target.value); if (dateFin && dateFin <= e.target.value) setDateFin(""); }}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Départ <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            required
            min={dateDebut || today}
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Price preview */}
      {nbJours > 0 && tarif > 0 && (
        <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50 p-3 dark:border-teal-800/40 dark:bg-teal-900/20">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{tarif} €/jour × {nbJours} jour{nbJours > 1 ? "s" : ""}</span>
            <span className="font-bold text-teal-700 dark:text-teal-400">{total} €</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400">Montant estimé — le paiement se fait à la confirmation.</p>
        </div>
      )}

      {/* Message */}
      <div className="mb-5">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Message (optionnel)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Présentez votre animal, ses habitudes, ses besoins particuliers…"
          className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
          feedback.ok
            ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-400"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
        }`}>
          {feedback.ok ? (
            <Check className="mr-1 inline-block h-4 w-4 align-text-bottom" aria-hidden />
          ) : (
            <TriangleAlert className="mr-1 inline-block h-4 w-4 align-text-bottom" aria-hidden />
          )}
          {feedback.msg}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-600"
      >
        {submitting ? "Envoi en cours…" : "Envoyer la demande"}
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrestatairePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [prestataire, setPrestataire] = useState<Prestataire | null>(null);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !id) return;
    fetch(`/api/prestataires/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data?.prestataire) setPrestataire(data.prestataire);
        if (data?.avis) setAvis(data.avis);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, id]);

  function authorName(a: Avis): string {
    const auteur = Array.isArray(a.auteur) ? a.auteur[0] : a.auteur;
    if (!auteur) return "Anonyme";
    return `${auteur.prenom} ${auteur.nom?.[0] ? auteur.nom[0] + "." : ""}`.trim();
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  const p = prestataire;
  const initials = p ? `${p.prenom?.[0] ?? ""}${p.nom?.[0] ?? ""}`.toUpperCase() : "";

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
      <AuthNavbar />

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-28">

        {/* Back */}
        <Link href="/search" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          Retour aux résultats
        </Link>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
          </div>
        )}

        {/* Not found */}
        {notFound && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <PawPrint className="h-14 w-14 text-zinc-300 dark:text-zinc-600" aria-hidden />
            <p className="font-serif text-2xl font-black text-zinc-700 dark:text-zinc-300">Prestataire introuvable</p>
            <Link href="/search" className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700">
              Retour à la recherche
            </Link>
          </div>
        )}

        {p && (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

            {/* ── LEFT: profile info ── */}
            <div className="space-y-6">

              {/* Hero card */}
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700/60 dark:bg-zinc-800">
                <div className="h-20 bg-gradient-to-r from-teal-500 to-teal-600" />
                <div className="-mt-10 px-6 pb-6">
                  {p.photo_profil ? (
                    <img src={p.photo_profil} alt={p.prenom}
                      className="mb-3 h-20 w-20 rounded-full border-4 border-white object-cover dark:border-zinc-800" />
                  ) : (
                    <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-teal-500 to-teal-600 font-serif text-2xl font-bold text-white dark:border-zinc-800">
                      {initials || "?"}
                    </div>
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="font-serif text-2xl font-black text-zinc-800 dark:text-zinc-100">
                        {p.prenom} {p.nom}
                      </h1>
                      <p className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> {p.ville} {p.code_postal}
                      </p>
                      {p.profil && (
                        <div className="mt-2 flex items-center gap-2">
                          <Stars note={p.profil.note_moyenne} />
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {p.profil.note_moyenne > 0
                              ? `${p.profil.note_moyenne.toFixed(1)} · ${p.profil.nb_avis} avis`
                              : "Nouveau prestataire"}
                          </span>
                        </div>
                      )}
                    </div>
                    {p.profil && (
                      <div className="text-right">
                        <p className="font-serif text-2xl font-black text-teal-600 dark:text-teal-400">
                          {p.profil.tarif_jour} €
                        </p>
                        <p className="text-xs text-zinc-400">par jour</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-right">
                    <ReportButton type="profil" cibleId={p.id_user} label="Signaler ce profil" />
                  </div>
                </div>
              </div>

              {/* Bio */}
              {p.profil?.bio && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700/60 dark:bg-zinc-800">
                  <h2 className="mb-3 font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">À propos</h2>
                  <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">{p.profil.bio}</p>
                </div>
              )}

              {/* Services & details */}
              {p.profil && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700/60 dark:bg-zinc-800">
                  <h2 className="mb-4 font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">Services</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([
                      { Icon: CalendarDays, label: "Expérience", value: `${p.profil.annees_experience} an${p.profil.annees_experience !== 1 ? "s" : ""}` },
                      { Icon: MapPin,       label: "Rayon d'action", value: `${p.profil.rayon_km} km` },
                      { Icon: Wallet,       label: "Tarif journalier", value: `${p.profil.tarif_jour} €/jour` },
                      { Icon: CircleCheck,  label: "Disponibilité", value: p.profil.disponible ? "Disponible" : "Non disponible" },
                    ] as { Icon: LucideIcon; label: string; value: string }[]).map(({ Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-700/50">
                        <Icon className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {p.profil.types_animaux.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Animaux acceptés
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {p.profil.types_animaux.map((a) => (
                          <span key={a} className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-400">
                            <AnimalIcon type={a} className="h-4 w-4" /> {a.charAt(0).toUpperCase() + a.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No profile fallback */}
              {!p.profil && (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Ce prestataire n&apos;a pas encore complété son profil.
                  </p>
                </div>
              )}

              {/* Reviews */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700/60 dark:bg-zinc-800">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">
                    Avis {avis.length > 0 && <span className="text-zinc-400">({avis.length})</span>}
                  </h2>
                  {p.profil && p.profil.note_moyenne > 0 && (
                    <div className="flex items-center gap-2">
                      <StarsReadonly note={p.profil.note_moyenne} />
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{p.profil.note_moyenne.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {avis.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-400">
                    Aucun avis pour le moment. Soyez le premier à recommander ce prestataire !
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {avis.map((a) => (
                      <div key={a.id} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-700/60">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{authorName(a)}</p>
                          <StarsReadonly note={a.note} />
                        </div>
                        {a.commentaire && <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">&ldquo;{a.commentaire}&rdquo;</p>}
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-[11px] text-zinc-400">
                            {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                          <ReportButton type="avis" cibleId={a.id} label="Signaler" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: offer form (sticky) ── */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              {p.profil ? (
                <OfferForm prestataire={p} />
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-700/60 dark:bg-zinc-800">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    La demande de garde n&apos;est pas encore disponible pour ce prestataire.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
