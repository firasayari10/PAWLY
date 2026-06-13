"use client";

import { useState } from "react";
import { Check, Flag } from "lucide-react";

interface Props {
  type: "profil" | "avis" | "reservation";
  cibleId: string;
  label?: string;
}

/** Small inline "Signaler" control that files a report via /api/signalements. */
export function ReportButton({ type, cibleId, label = "Signaler" }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function report() {
    const motif = window.prompt("Motif du signalement :");
    if (!motif || !motif.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/signalements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, cible_id: cibleId, motif: motif.trim() }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
        Signalement envoyé <Check className="h-3 w-3" aria-hidden />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={report}
      disabled={state === "sending"}
      className="inline-flex items-center gap-1 text-xs text-zinc-400 transition hover:text-red-500 disabled:opacity-50"
    >
      {state === "error" ? (
        "Échec — réessayer"
      ) : (
        <>
          <Flag className="h-3 w-3" aria-hidden /> {label}
        </>
      )}
    </button>
  );
}
