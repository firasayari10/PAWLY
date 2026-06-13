// ============================================================
// PAWLY — Chat attachment domain logic (pure, framework-free, unit-tested)
// Validation + path rules for encrypted image/video attachments, and the JSON
// envelope embedded in every chat message's plaintext before encryption.
//
// E2EE trade-off: the server never sees the file contents nor the envelope, so
// the per-kind size limits below are enforced on honest clients only. The hard
// server-side cap is the `file_size_limit` of the private `chat-attachments`
// bucket (see supabase/sprint7.sql).
// ============================================================

export const ATTACHMENT_BUCKET = "chat-attachments";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 Mo
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 Mo
export const MAX_NAME_LENGTH = 100;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export type MediaKind = "image" | "video";

/** The attachment kind for a mime type, or null when unsupported. */
export function kindForMime(mime: string): MediaKind | null {
  if (IMAGE_TYPES.includes(mime)) return "image";
  if (VIDEO_TYPES.includes(mime)) return "video";
  return null;
}

/** Validate a declared upload (mime + plaintext size). Returns an error message or null. */
export function validateAttachmentDeclaration(input: {
  mime?: unknown;
  size?: unknown;
}): string | null {
  const { mime, size } = input;
  if (typeof mime !== "string" || !mime) return "Type de fichier manquant.";
  const kind = kindForMime(mime);
  if (!kind) return "Type de fichier non supporté (images JPEG/PNG/WebP/GIF ou vidéos MP4/WebM).";
  if (typeof size !== "number" || !Number.isFinite(size) || !Number.isInteger(size) || size <= 0) {
    return "Taille de fichier invalide.";
  }
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (size > max) {
    return kind === "image" ? "Image trop volumineuse (10 Mo max)." : "Vidéo trop volumineuse (50 Mo max).";
  }
  return null;
}

/** Storage object path for an attachment; the uuid is injected for testability. */
export function buildAttachmentPath(conversationId: string, uuid: string): string {
  return `${conversationId}/${uuid}`;
}

const PATH_SEGMENT_RE = /^[A-Za-z0-9-]+$/;

/** True iff `path` is exactly `${conversationId}/<single safe segment>` (no traversal). */
export function isPathInConversation(path: string, conversationId: string): boolean {
  if (typeof path !== "string" || !path || !conversationId) return false;
  const prefix = `${conversationId}/`;
  if (!path.startsWith(prefix)) return false;
  const segment = path.slice(prefix.length);
  return PATH_SEGMENT_RE.test(segment);
}

// ── Message envelope ─────────────────────────────────────────────────────────
// The plaintext of every chat message is one of these JSON envelopes. Legacy
// messages (sent before attachments existed) are bare strings; parseEnvelope
// folds them back into a text envelope.

export interface TextEnvelope {
  t: "text";
  body: string;
}

export interface MediaEnvelope {
  t: "media";
  kind: MediaKind;
  path: string;
  mime: string;
  size: number;
  name: string;
  /** base64 12-byte IV used to AES-GCM-encrypt the file bytes. */
  fileIv: string;
}

export type ChatEnvelope = TextEnvelope | MediaEnvelope;

/** Serialize an envelope to the plaintext to encrypt (truncates long file names). */
export function serializeEnvelope(envelope: ChatEnvelope): string {
  if (envelope.t === "media") {
    return JSON.stringify({ ...envelope, name: envelope.name.slice(0, MAX_NAME_LENGTH) });
  }
  return JSON.stringify(envelope);
}

function isValidMediaEnvelope(v: Record<string, unknown>): v is Record<string, unknown> & MediaEnvelope {
  return (
    (v.kind === "image" || v.kind === "video") &&
    typeof v.path === "string" && v.path.length > 0 &&
    typeof v.mime === "string" && kindForMime(v.mime) === v.kind &&
    typeof v.size === "number" && Number.isFinite(v.size) && v.size > 0 &&
    typeof v.name === "string" &&
    typeof v.fileIv === "string" && v.fileIv.length > 0
  );
}

/** Parse decrypted plaintext into an envelope; anything unrecognized becomes text. */
export function parseEnvelope(plaintext: string): ChatEnvelope {
  try {
    const parsed: unknown = JSON.parse(plaintext);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const v = parsed as Record<string, unknown>;
      if (v.t === "text" && typeof v.body === "string") {
        return { t: "text", body: v.body };
      }
      if (v.t === "media" && isValidMediaEnvelope(v)) {
        return {
          t: "media",
          kind: v.kind,
          path: v.path,
          mime: v.mime,
          size: v.size,
          name: v.name.slice(0, MAX_NAME_LENGTH),
          fileIv: v.fileIv,
        };
      }
    }
  } catch {
    // Not JSON → legacy plain-text message.
  }
  return { t: "text", body: plaintext };
}
