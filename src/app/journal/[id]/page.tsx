"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { ArrowLeft, Check, Globe, Lock, PawPrint, TriangleAlert } from "lucide-react";
import { AuthNavbar } from "@/components/auth-navbar";

interface Photo { id: string; url: string }
interface Entry {
  id: string;
  titre: string;
  contenu: string;
  auteur_id: string;
  created_at: string;
  journal_photo?: Photo[];
}
interface Journal {
  id: string;
  proprietaire_id: string;
  titre: string;
  nom_animal: string;
  type_animal: string;
  is_public: boolean;
  public_slug: string | null;
  journal_entry?: Entry[];
}

export default function JournalDetailPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const searchParams = useSearchParams();
  const offreId = searchParams.get("offre");

  const [journal, setJournal] = useState<Journal | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/${id}`);
      if (res.status === 404 || res.status === 403) { setNotFound(true); return; }
      const data = await res.json();
      if (res.ok) {
        setJournal(data.journal);
        setIsOwner(Boolean(data.isOwner));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.set("titre", titre);
      fd.set("contenu", contenu);
      if (offreId) fd.set("offre_id", offreId);
      const files = fileRef.current?.files;
      if (files) for (const f of Array.from(files)) fd.append("photos", f);

      const res = await fetch(`/api/journal/${id}/entries`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setTitre("");
      setContenu("");
      if (fileRef.current) fileRef.current.value = "";
      setFeedback({ ok: true, msg: "Entrée publiée." });
      load();
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublic = async () => {
    if (!journal) return;
    const res = await fetch(`/api/journal/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: !journal.is_public }),
    });
    if (res.ok) {
      const data = await res.json();
      setJournal((j) => (j ? { ...j, is_public: data.journal.is_public } : j));
    }
  };

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  const shareUrl =
    journal?.public_slug && typeof window !== "undefined"
      ? `${window.location.origin}/journal/public/${journal.public_slug}`
      : "";

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
      <AuthNavbar />
      <main className="mx-auto max-w-3xl px-6 pb-16 pt-24">
        <Link href="/journal" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline dark:text-teal-400">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Tous les journaux
        </Link>

        {notFound ? (
          <p className="mt-8 text-zinc-500">Journal introuvable ou accès refusé.</p>
        ) : loading || !journal ? (
          <div className="mt-6 h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        ) : (
          <>
            <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-3xl font-black text-zinc-800 dark:text-zinc-100">{journal.titre}</h1>
                <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <PawPrint className="h-3.5 w-3.5 shrink-0" aria-hidden /> {journal.nom_animal} · {journal.type_animal}
                </p>
              </div>
              {isOwner && (
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={togglePublic}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      journal.is_public
                        ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-400"
                        : "border-zinc-300 text-zinc-600 hover:border-teal-400 dark:border-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {journal.is_public ? (
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4" aria-hidden /> Public — cliquer pour rendre privé
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Lock className="h-4 w-4" aria-hidden /> Privé — rendre public
                      </span>
                    )}
                  </button>
                  {journal.is_public && shareUrl && (
                    <button
                      onClick={() => navigator.clipboard?.writeText(shareUrl)}
                      className="text-xs text-teal-600 hover:underline dark:text-teal-400"
                    >
                      Copier le lien public
                    </button>
                  )}
                </div>
              )}
            </header>

            {/* Composer */}
            <form onSubmit={handleAddEntry} className="mb-8 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700/60 dark:bg-zinc-800">
              <input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Titre de l'entrée (ex. Jour 1 — promenade)"
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <textarea
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                placeholder="Racontez la journée…"
                rows={3}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <input ref={fileRef} type="file" accept="image/*" multiple className="text-sm text-zinc-500" />
              <button
                type="submit"
                disabled={submitting}
                className="justify-self-start rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {submitting ? "Publication…" : "Publier l'entrée"}
              </button>
              {feedback && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${feedback.ok ? "border-teal-200 bg-teal-50 text-teal-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {feedback.ok ? (
                    <Check className="mr-1 inline-block h-4 w-4 align-text-bottom" aria-hidden />
                  ) : (
                    <TriangleAlert className="mr-1 inline-block h-4 w-4 align-text-bottom" aria-hidden />
                  )}
                  {feedback.msg}
                </div>
              )}
            </form>

            {/* Timeline */}
            <div className="space-y-5">
              {(journal.journal_entry ?? []).length === 0 && (
                <p className="text-sm text-zinc-400">Aucune entrée pour le moment.</p>
              )}
              {(journal.journal_entry ?? []).map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700/60 dark:bg-zinc-800">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">{entry.titre}</h3>
                    <time className="text-xs text-zinc-400">{new Date(entry.created_at).toLocaleDateString("fr-FR")}</time>
                  </div>
                  {entry.contenu && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{entry.contenu}</p>}
                  {entry.journal_photo && entry.journal_photo.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {entry.journal_photo.map((ph) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={ph.id} src={ph.url} alt="" className="h-32 w-full rounded-xl object-cover" />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
