"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@clerk/nextjs";
import { ImagePlus, Loader2, Lock, MessageCircle, ShieldCheck, X } from "lucide-react";
import { getOrCreateMyKeyPair } from "@/lib/e2ee-store";
import {
  importPublicKey,
  deriveSharedKey,
  encrypt,
  decrypt,
  encryptBytes,
  decryptBytes,
} from "@/lib/e2ee";
import {
  ATTACHMENT_BUCKET,
  kindForMime,
  parseEnvelope,
  serializeEnvelope,
  validateAttachmentDeclaration,
  type ChatEnvelope,
  type MediaEnvelope,
} from "@/lib/chat-attachments";
import { createBrowserSupabase } from "@/lib/supabase-browser";

// ── End-to-end-encrypted chat for one accepted booking ──────────────────────
// Messages are encrypted in the browser (ECDH-derived AES-GCM key) before they
// leave the device; the server only stores ciphertext. Delivery is live via
// Supabase Realtime, with a polling fallback so it works even before the
// Clerk↔Supabase Realtime bridge is configured.
//
// Attachments (images/vidéos) are encrypted with the same conversation key and
// stored as opaque blobs in the private `chat-attachments` bucket; the message
// itself carries an encrypted JSON envelope referencing the blob (see
// lib/chat-attachments.ts).

type Status = "loading" | "ready" | "waiting_peer" | "error";

interface ChatMessage {
  id: string;
  mine: boolean;
  created_at: string;
  env: ChatEnvelope;
  /** True when this device could not decrypt the ciphertext. */
  unreadable?: boolean;
}

interface CipherRow {
  id: string;
  sender_id: string;
  ciphertext: string;
  iv: string;
  created_at: string;
}

const FILE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export function ChatBox({
  offreId,
  peerName,
  onClose,
}: {
  offreId: string;
  peerName?: string;
  onClose?: () => void;
}) {
  const { session } = useSession();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const myIdRef = useRef<string | null>(null);
  const convIdRef = useRef<string | null>(null);
  const sharedKeyRef = useRef<CryptoKey | null>(null);
  const supaRef = useRef<ReturnType<typeof createBrowserSupabase> | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const lastAtRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Decrypted media object URLs, keyed by message id; revoked on unmount.
  const mediaUrlsRef = useRef<Map<string, string>>(new Map());

  // Decrypt one ciphertext row and append it (dedup by id).
  const appendRow = useCallback(async (row: CipherRow) => {
    if (seenRef.current.has(row.id) || !sharedKeyRef.current) return;
    seenRef.current.add(row.id);
    let env: ChatEnvelope;
    let unreadable = false;
    try {
      env = parseEnvelope(await decrypt({ ciphertext: row.ciphertext, iv: row.iv }, sharedKeyRef.current));
    } catch {
      env = { t: "text", body: "Message illisible sur cet appareil." };
      unreadable = true;
    }
    lastAtRef.current = row.created_at;
    setMessages((prev) =>
      [...prev, { id: row.id, mine: row.sender_id === myIdRef.current, env, unreadable, created_at: row.created_at }]
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    );
  }, []);

  useEffect(() => {
    let alive = true;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        // 1. Ensure this device has a keypair and the server knows our public key.
        const { keyPair, publicKeyBase64 } = await getOrCreateMyKeyPair();
        await fetch("/api/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_key: publicKeyBase64 }),
        });

        // 2. Resolve the conversation + the peer's public key.
        const convRes = await fetch(`/api/conversations/${offreId}`);
        if (!convRes.ok) {
          const j = await convRes.json().catch(() => ({}));
          throw new Error(j.error ?? "Conversation indisponible.");
        }
        const conv = await convRes.json();
        if (!alive) return;
        myIdRef.current = conv.me.id_user;
        convIdRef.current = conv.conversation.id;

        if (!conv.peer?.public_key) {
          setStatus("waiting_peer");
          return;
        }

        // 3. Derive the shared AES key for this pair.
        const peerPub = await importPublicKey(conv.peer.public_key);
        sharedKeyRef.current = await deriveSharedKey(keyPair.privateKey, peerPub);

        // 4. Load + decrypt history.
        const histRes = await fetch(`/api/conversations/${offreId}/messages`);
        const hist = await histRes.json();
        for (const row of (hist.messages ?? []) as CipherRow[]) await appendRow(row);
        if (!alive) return;
        setStatus("ready");

        // 5a. Live delivery via Realtime (no-op if the bridge isn't configured yet).
        // The client is kept in a ref so attachment uploads can reuse it.
        const supa = createBrowserSupabase(async () => (await session?.getToken()) ?? null);
        supaRef.current = supa;
        const channel = supa
          .channel(`conv:${convIdRef.current}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "chat_message", filter: `conversation_id=eq.${convIdRef.current}` },
            (payload) => { void appendRow(payload.new as CipherRow); },
          )
          .subscribe();

        // 5b. Polling fallback (covers the case where Realtime isn't wired up).
        const poll = setInterval(async () => {
          const after = lastAtRef.current ? `?after=${encodeURIComponent(lastAtRef.current)}` : "";
          const r = await fetch(`/api/conversations/${offreId}/messages${after}`);
          if (!r.ok) return;
          const j = await r.json();
          for (const row of (j.messages ?? []) as CipherRow[]) await appendRow(row);
        }, 4000);

        cleanup = () => { supa.removeChannel(channel); clearInterval(poll); };
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Erreur de chargement du chat.");
        setStatus("error");
      }
    })();

    const mediaUrls = mediaUrlsRef.current;
    return () => {
      alive = false;
      cleanup?.();
      for (const url of mediaUrls.values()) URL.revokeObjectURL(url);
      mediaUrls.clear();
    };
  }, [offreId, session, appendRow]);

  // Keep the view pinned to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Encrypt an envelope and POST it as a chat message.
  const sendEnvelope = useCallback(async (env: ChatEnvelope) => {
    if (!sharedKeyRef.current) return false;
    const payload = await encrypt(serializeEnvelope(env), sharedKeyRef.current);
    const res = await fetch(`/api/conversations/${offreId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const { message } = await res.json();
    await appendRow(message as CipherRow);
    return true;
  }, [offreId, appendRow]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !sharedKeyRef.current || sending) return;
    setSending(true);
    try {
      if (await sendEnvelope({ t: "text", body: text })) setInput("");
    } finally {
      setSending(false);
    }
  }, [input, sending, sendEnvelope]);

  // Encrypt + upload one file, then send the media envelope referencing it.
  const sendFile = useCallback(async (file: File) => {
    if (!sharedKeyRef.current || !supaRef.current || uploading) return;
    setUploadError(null);

    const kind = kindForMime(file.type);
    const validationError = validateAttachmentDeclaration({ mime: file.type, size: file.size });
    if (!kind || validationError) {
      setUploadError(validationError ?? "Type de fichier non supporté.");
      return;
    }

    setUploading(true);
    try {
      const { bytes, iv } = await encryptBytes(await file.arrayBuffer(), sharedKeyRef.current);

      const urlRes = await fetch(`/api/conversations/${offreId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime: file.type, size: file.size }),
      });
      if (!urlRes.ok) {
        const j = await urlRes.json().catch(() => ({}));
        throw new Error(j.error ?? "Envoi de la pièce jointe impossible.");
      }
      const { path, token } = await urlRes.json();

      const { error: uploadErr } = await supaRef.current.storage
        .from(ATTACHMENT_BUCKET)
        .uploadToSignedUrl(path, token, bytes, { contentType: "application/octet-stream" });
      if (uploadErr) throw new Error("Envoi de la pièce jointe impossible.");

      const sent = await sendEnvelope({
        t: "media",
        kind,
        path,
        mime: file.type,
        size: file.size,
        name: file.name,
        fileIv: iv,
      });
      if (!sent) throw new Error("Envoi du message impossible.");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Envoi de la pièce jointe impossible.");
    } finally {
      setUploading(false);
    }
  }, [offreId, uploading, sendEnvelope]);

  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700/60 dark:bg-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-700/60">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            <MessageCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden />
            {peerName ? `Discussion avec ${peerName}` : "Discussion"}
          </span>
          <span
            title="Chiffré de bout en bout"
            className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
          >
            <ShieldCheck className="h-3 w-3" aria-hidden />
            chiffré de bout en bout
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200" aria-label="Fermer">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex max-h-72 min-h-[8rem] flex-col gap-2 overflow-y-auto p-4">
        {status === "loading" && <p className="m-auto text-sm text-zinc-400">Chargement sécurisé…</p>}
        {status === "error" && <p className="m-auto text-sm text-red-500">{error}</p>}
        {status === "waiting_peer" && (
          <p className="m-auto text-center text-sm text-zinc-400">
            En attente que votre interlocuteur ouvre la discussion pour activer le chiffrement.
          </p>
        )}
        {status === "ready" && messages.length === 0 && (
          <p className="m-auto text-sm text-zinc-400">Aucun message. Dites bonjour.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-2xl text-sm ${
              m.env.t === "media" ? "overflow-hidden p-1" : "px-3.5 py-2"
            } ${
              m.mine
                ? "ml-auto bg-teal-600 text-white dark:bg-teal-500"
                : "mr-auto bg-zinc-100 text-zinc-800 dark:bg-zinc-700/60 dark:text-zinc-100"
            }`}
          >
            {m.env.t === "media" ? (
              <MediaBubble
                offreId={offreId}
                messageId={m.id}
                media={m.env}
                sharedKeyRef={sharedKeyRef}
                urlCacheRef={mediaUrlsRef}
              />
            ) : m.unreadable ? (
              <span className="flex items-center gap-1.5 italic opacity-80">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {m.env.body}
              </span>
            ) : (
              m.env.body
            )}
          </div>
        ))}
      </div>

      {status === "ready" && (
        <div className="border-t border-zinc-100 p-3 dark:border-zinc-700/60">
          {uploadError && <p className="mb-2 text-xs text-red-500">{uploadError}</p>}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void sendFile(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Envoyer une photo ou une vidéo"
              aria-label="Envoyer une photo ou une vidéo"
              className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:border-teal-400 hover:text-teal-600 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-teal-400"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
              placeholder="Votre message…"
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm outline-none focus:border-teal-400 dark:border-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-100"
            />
            <button
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-600"
            >
              Envoyer
            </button>
          </div>
          {uploading && <p className="mt-2 text-xs text-zinc-400">Envoi de la pièce jointe…</p>}
        </div>
      )}
    </div>
  );
}

// Downloads, decrypts and renders one encrypted attachment. The decrypted
// object URL is cached per message id in the parent's ref so re-renders and
// polling don't re-download, and revoked when the chat unmounts.
function MediaBubble({
  offreId,
  messageId,
  media,
  sharedKeyRef,
  urlCacheRef,
}: {
  offreId: string;
  messageId: string;
  media: MediaEnvelope;
  sharedKeyRef: React.RefObject<CryptoKey | null>;
  urlCacheRef: React.RefObject<Map<string, string>>;
}) {
  const [url, setUrl] = useState<string | null>(() => urlCacheRef.current?.get(messageId) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (url) return;
    let alive = true;

    (async () => {
      try {
        const key = sharedKeyRef.current;
        if (!key) throw new Error("missing key");

        const r = await fetch(
          `/api/conversations/${offreId}/attachments?path=${encodeURIComponent(media.path)}`,
        );
        if (!r.ok) throw new Error("signed url");
        const { url: signedUrl } = await r.json();

        const blobRes = await fetch(signedUrl);
        if (!blobRes.ok) throw new Error("download");
        const plain = await decryptBytes(await blobRes.arrayBuffer(), media.fileIv, key);
        if (!alive) return;

        const objectUrl = URL.createObjectURL(new Blob([plain], { type: media.mime }));
        urlCacheRef.current?.set(messageId, objectUrl);
        setUrl(objectUrl);
      } catch {
        if (alive) setFailed(true);
      }
    })();

    return () => { alive = false; };
  }, [url, offreId, messageId, media, sharedKeyRef, urlCacheRef]);

  if (failed) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs italic opacity-80">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Pièce jointe illisible.
      </span>
    );
  }

  if (!url) {
    return (
      <span className="flex h-24 w-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin opacity-60" aria-hidden />
      </span>
    );
  }

  if (media.kind === "video") {
    return <video src={url} controls preload="metadata" className="max-h-56 rounded-xl" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- decrypted blob URL, next/image can't optimize it
    <img
      src={url}
      alt={media.name || "Pièce jointe"}
      className="max-h-56 cursor-pointer rounded-xl object-contain"
      onClick={() => window.open(url, "_blank", "noopener")}
    />
  );
}
