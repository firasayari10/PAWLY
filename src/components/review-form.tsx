"use client";

import { useState } from "react";
import { Star, TriangleAlert } from "lucide-react";

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Note">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="text-amber-400 transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 fill-current ${n <= active ? "opacity-100" : "opacity-30"}`}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({
  offreId,
  prestataireName,
  onSubmitted,
}: {
  offreId: string;
  prestataireName: string;
  onSubmitted: () => void;
}) {
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (note < 1) { setError("Veuillez sélectionner une note."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offre_id: offreId, note, commentaire }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-700/30">
      <p className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
        Notez votre expérience avec {prestataireName}
      </p>
      <StarInput value={note} onChange={setNote} />
      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Partagez votre expérience (optionnel)…"
        className="mt-3 w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
      />
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-600"
      >
        {submitting ? "Envoi…" : "Publier mon avis"}
      </button>
    </form>
  );
}

// Read-only star display, shared by booking cards and history.
export function StarsReadonly({ note, size = 14 }: { note: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400" aria-label={`Note ${note} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < Math.round(note) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}
