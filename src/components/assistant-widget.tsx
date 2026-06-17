"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { AssistantSparkle } from "@/components/icons";

// ── Pawly AI assistant ──────────────────────────────────────────────────────
// A floating sparkle launcher that opens a chat panel talking to /api/assistant.
// The endpoint streams Server-Sent-Event lines ({type:"token"|"sources"|...}),
// which we parse incrementally so the answer appears as it is generated. Styling
// mirrors the booking ChatBox (rounded-2xl card, teal bubbles) for consistency.

interface Source {
  n: number;
  title: string;
  source: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant Pawly 🐾. Posez-moi vos questions sur la garde de votre animal, son bien-être, ou l'utilisation de Pawly.",
};

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    const history: Msg[] = [...messages, { role: "user", content: text }];
    // Optimistically add the user turn + an empty assistant turn to fill in.
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    // Update only the last (assistant) message as tokens stream in.
    const patchLast = (fn: (m: Msg) => Msg) =>
      setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? fn(m) : m)));

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Erreur de l'assistant.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;
          let evt: { type: string; value?: string; sources?: Source[]; error?: string };
          try {
            evt = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (evt.type === "token" && evt.value) {
            patchLast((m) => ({ ...m, content: m.content + evt.value }));
          } else if (evt.type === "sources" && evt.sources?.length) {
            patchLast((m) => ({ ...m, sources: evt.sources }));
          } else if (evt.type === "error") {
            patchLast((m) => ({ ...m, content: evt.error ?? "Erreur." }));
          }
        }
      }
    } catch (e) {
      patchLast((m) => ({
        ...m,
        content: e instanceof Error ? e.message : "Erreur de l'assistant.",
      }));
    } finally {
      setBusy(false);
    }
  }, [input, busy, messages]);

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant Pawly"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
        >
          <AssistantSparkle className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700/60 dark:bg-zinc-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3 text-white dark:border-zinc-700/60 dark:from-teal-600 dark:to-teal-800">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <AssistantSparkle className="h-4 w-4 text-amber-300" />
              Assistant Pawly
            </span>
            <button onClick={() => setOpen(false)} aria-label="Fermer l'assistant" className="text-white/80 transition hover:text-white">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-4" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-teal-600 text-white dark:bg-teal-500"
                    : "mr-auto bg-zinc-100 text-zinc-800 dark:bg-zinc-700/60 dark:text-zinc-100"
                }`}
              >
                {m.content || (busy && i === messages.length - 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin opacity-70" aria-hidden />
                ) : null)}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 border-t border-zinc-200/60 pt-1.5 text-[11px] text-zinc-500 dark:border-zinc-600/60 dark:text-zinc-400">
                    <span className="font-semibold">Sources : </span>
                    {m.sources.map((s) => `[${s.n}] ${s.title}`).join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="border-t border-zinc-100 p-3 dark:border-zinc-700/60">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
                placeholder="Posez votre question…"
                disabled={busy}
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm outline-none focus:border-teal-400 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-100"
              />
              <button
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                aria-label="Envoyer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-600"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-zinc-400">
              {"L'assistant ne remplace pas un·e vétérinaire."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
