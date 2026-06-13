// ============================================================
// PAWLY — Conversation domain logic (pure, framework-free, unit-tested)
// Access + validation rules for the owner↔sitter chat, kept here so they can be
// tested without Clerk or Supabase and reused by every chat route.
// ============================================================

/** A chat exists for a booking only once the sitter has accepted it. */
export function canChat(statut: string | null | undefined): boolean {
  return statut === "accepte";
}

export interface ConversationParticipants {
  proprietaire_id: string;
  prestataire_id: string;
}

/** Is this user one of the two participants of the conversation/booking? */
export function isParticipant(
  userId: string | null | undefined,
  conv: ConversationParticipants,
): boolean {
  if (!userId) return false;
  return userId === conv.proprietaire_id || userId === conv.prestataire_id;
}

/** The other participant's id, or null if the user isn't a participant. */
export function peerId(
  userId: string,
  conv: ConversationParticipants,
): string | null {
  if (userId === conv.proprietaire_id) return conv.prestataire_id;
  if (userId === conv.prestataire_id) return conv.proprietaire_id;
  return null;
}

/** Hard cap on a single encrypted message (base64 ciphertext length). */
export const MAX_CIPHERTEXT_LENGTH = 8192;

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Validate an encrypted message payload. Returns an error message or null. */
export function validateMessageInput(input: {
  ciphertext?: unknown;
  iv?: unknown;
}): string | null {
  const { ciphertext, iv } = input;
  if (typeof ciphertext !== "string" || typeof iv !== "string") {
    return "Message chiffré invalide.";
  }
  if (!ciphertext || !iv) return "Message chiffré vide.";
  if (ciphertext.length > MAX_CIPHERTEXT_LENGTH) return "Message trop long.";
  if (!BASE64_RE.test(ciphertext) || !BASE64_RE.test(iv)) {
    return "Message chiffré mal formé.";
  }
  return null;
}

/** Validate a public-key registration payload. Returns an error message or null. */
export function validatePublicKey(publicKey: unknown): string | null {
  if (typeof publicKey !== "string" || !publicKey) return "Clé publique manquante.";
  if (publicKey.length > 1024 || !BASE64_RE.test(publicKey)) return "Clé publique invalide.";
  return null;
}
