// ============================================================
// PAWLY — RAG prompt assembly (pure, framework-free, unit-tested)
// Turns retrieved knowledge-base chunks into the grounded context + system
// prompt the assistant runs on. No network here, so the prompt shape and the
// guardrails are fully testable offline.
// ============================================================

export interface RetrievedChunk {
  id: string;
  content: string;
  title: string;
  category: string;
  source: string;
  score?: number;
}

export interface Source {
  n: number;
  title: string;
  source: string;
}

/** Max chars of KB context we inject, to keep the prompt within budget. */
export const MAX_CONTEXT_CHARS = 6000;

/**
 * System prompt: scopes the assistant to pet care + Pawly usage, in French,
 * and enforces the "consult a vet" medical guardrail and source citations.
 */
export function buildSystemPrompt(userFirstName?: string | null): string {
  const greeting = userFirstName ? ` L'utilisateur s'appelle ${userFirstName}.` : "";
  return [
    "Tu es Pawly Assistant, l'assistant IA de l'application Pawly (garde d'animaux).",
    `Tu réponds en français, de façon claire, bienveillante et concise.${greeting}`,
    "",
    "Règles :",
    "- Réponds uniquement à partir du CONTEXTE fourni et des informations de l'application. Si le contexte ne contient pas la réponse, dis-le honnêtement et propose de reformuler.",
    "- Cite tes sources en fin de réponse avec leur numéro entre crochets, par exemple [1].",
    "- Tu n'es PAS vétérinaire : pour tout symptôme grave, urgence ou diagnostic, recommande explicitement de consulter un·e vétérinaire. Ne donne jamais de diagnostic définitif ni de posologie médicamenteuse.",
    "- Pour les questions sur l'utilisation de Pawly (réservation, paiement, journal, messagerie, avis), appuie-toi sur le contexte FAQ.",
    "- Utilise les outils disponibles quand l'utilisateur demande ses propres données (ses réservations, ses journaux, des vétérinaires proches).",
  ].join("\n");
}

/**
 * Format retrieved chunks into a numbered context block, truncated to the
 * budget. The numbering matches `extractSources` so citations line up.
 */
export function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "Aucun document pertinent trouvé.";

  const parts: string[] = [];
  let total = 0;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const entry = `[${i + 1}] ${c.title} (${c.source})\n${c.content}`;
    if (total + entry.length > MAX_CONTEXT_CHARS && parts.length > 0) break;
    parts.push(entry);
    total += entry.length;
  }
  return parts.join("\n\n");
}

/** Build the user-facing source list (deduped numbering matches the context). */
export function extractSources(chunks: RetrievedChunk[]): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const key = `${c.title}|${c.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ n: i + 1, title: c.title, source: c.source });
  }
  return sources;
}

/** Assemble the full grounded user turn (context + question). */
export function buildGroundedUserMessage(question: string, chunks: RetrievedChunk[]): string {
  return [
    "CONTEXTE :",
    buildContextBlock(chunks),
    "",
    "QUESTION :",
    question,
  ].join("\n");
}
