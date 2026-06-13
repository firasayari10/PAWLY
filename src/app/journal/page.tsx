"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { Check, NotebookPen, PawPrint, TriangleAlert } from "lucide-react";
import { AuthNavbar } from "@/components/auth-navbar";
import { JournalTabs } from "@/components/journal-tabs";

interface JournalSummary {
  id: string;
  titre: string;
  nom_animal: string;
  type_animal: string;
  is_public: boolean;
  public_slug: string | null;
  updated_at: string;
}

const ANIMAL_OPTIONS = ["chien", "chat", "lapin", "oiseau", "rongeur", "reptile"];

export default function JournalListPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [owned, setOwned] = useState<JournalSummary[]>([]);
  const [contributed, setContributed] = useState<JournalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [titre, setTitre] = useState("");
  const [nomAnimal, setNomAnimal] = useState("");
  const [typeAnimal, setTypeAnimal] = useState("chien");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/journal");
      const data = await res.json();
      if (res.ok) {
        setOwned(data.owned ?? []);
        setContributed(data.contributed ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre, nom_animal: nomAnimal, type_animal: typeAnimal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setTitre("");
      setNomAnimal("");
      setFeedback({ ok: true, msg: "Journal créé." });
      load();
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
      <AuthNavbar />
      <JournalTabs />
      <main className="mx-auto max-w-4xl px-6 pb-16 pt-8">
        <header className="mb-8">
          <h1 className="flex items-center gap-2.5 font-serif text-3xl font-black text-zinc-800 dark:text-zinc-100">
            <NotebookPen className="h-7 w-7 text-teal-600 dark:text-teal-400" aria-hidden /> Mon journal
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tenez le carnet de votre animal, et suivez les nouvelles publiées par son gardien.
          </p>
        </header>

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          className="mb-10 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700/60 dark:bg-zinc-800 sm:grid-cols-3"
        >
          <div className="flex flex-col gap-1 sm:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Titre du journal</label>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Les aventures de Rex"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Nom de l&apos;animal</label>
            <input
              value={nomAnimal}
              onChange={(e) => setNomAnimal(e.target.value)}
              placeholder="Rex"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Type</label>
            <select
              value={typeAnimal}
              onChange={(e) => setTypeAnimal(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {ANIMAL_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "…" : "Créer"}
            </button>
          </div>
          {feedback && (
            <div
              className={`sm:col-span-3 rounded-xl border px-4 py-3 text-sm font-medium ${
                feedback.ok
                  ? "border-teal-200 bg-teal-50 text-teal-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {feedback.ok ? (
                <Check className="mr-1 inline-block h-4 w-4 align-text-bottom" aria-hidden />
              ) : (
                <TriangleAlert className="mr-1 inline-block h-4 w-4 align-text-bottom" aria-hidden />
              )}
              {feedback.msg}
            </div>
          )}
        </form>

        {/* Owned journals */}
        <Section title="Mes journaux" empty="Vous n'avez pas encore de journal." loading={loading} items={owned} />

        {/* Contributed journals */}
        {contributed.length > 0 && (
          <div className="mt-10">
            <Section title="Journaux où je contribue (gardes)" empty="" loading={false} items={contributed} />
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  title, empty, loading, items,
}: { title: string; empty: string; loading: boolean; items: JournalSummary[] }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-lg font-bold text-zinc-700 dark:text-zinc-200">{title}</h2>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        empty ? <p className="text-sm text-zinc-400">{empty}</p> : null
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((j) => (
            <Link
              key={j.id}
              href={`/journal/${j.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700/60 dark:bg-zinc-800"
            >
              <div className="flex items-center justify-between">
                <p className="font-serif text-base font-bold text-zinc-800 dark:text-zinc-100">{j.titre}</p>
                {j.is_public && (
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
                    Public
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <PawPrint className="h-3 w-3 shrink-0" aria-hidden /> {j.nom_animal} · {j.type_animal}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
