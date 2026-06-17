// ============================================================
// PAWLY — Knowledge-base chunking & frontmatter parsing
// Pure, framework-free helpers shared by the ingestion script and unit tests.
// No network, no Azure SDK — so the splitting rules can be tested offline.
// ============================================================

export interface DocMeta {
  title: string;
  category: string;
  source: string;
  lang: string;
}

export interface ParsedDoc {
  meta: DocMeta;
  body: string;
}

/**
 * Parse a markdown file with a leading `--- ... ---` YAML-ish frontmatter block.
 * Only flat `key: value` pairs are supported (enough for our KB), which keeps us
 * free of a YAML dependency. Missing keys fall back to sensible defaults.
 */
export function parseFrontmatter(raw: string, fallbackSource = "kb"): ParsedDoc {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw);
  const meta: DocMeta = { title: "", category: "general", source: fallbackSource, lang: "fr" };

  if (!match) {
    return { meta: { ...meta, title: fallbackSource }, body: raw.trim() };
  }

  for (const line of match[1].split("\n")) {
    const kv = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const value = kv[2].replace(/^["']|["']$/g, "").trim();
    if (key === "title" || key === "category" || key === "source" || key === "lang") {
      meta[key] = value;
    }
  }
  if (!meta.title) meta.title = fallbackSource;

  return { meta, body: match[2].trim() };
}

export interface ChunkOptions {
  /** Approximate maximum characters per chunk (~500–800 tokens). */
  maxChars?: number;
  /** Characters of trailing context repeated at the start of the next chunk. */
  overlapChars?: number;
}

/**
 * Split text into overlapping chunks on paragraph boundaries, never mid-word.
 * Paragraphs longer than `maxChars` are hard-split. Deterministic: the same
 * input always yields the same chunks (so ingestion ids are stable).
 */
export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? 1500;
  const overlapChars = opts.overlapChars ?? 200;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = "";
  };

  for (const para of paragraphs) {
    for (const piece of hardSplit(para, maxChars)) {
      if (current && current.length + piece.length + 2 > maxChars) {
        const tail = overlapChars > 0 ? current.slice(-overlapChars) : "";
        flush();
        current = tail ? `${tail}\n\n${piece}` : piece;
      } else {
        current = current ? `${current}\n\n${piece}` : piece;
      }
    }
  }
  flush();

  return chunks;
}

/** Split an over-long paragraph into <=maxChars pieces on word boundaries. */
function hardSplit(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];

  const pieces: string[] = [];
  const words = paragraph.split(/\s+/);
  let buf = "";
  for (const word of words) {
    if (buf && buf.length + word.length + 1 > maxChars) {
      pieces.push(buf);
      buf = word;
    } else {
      buf = buf ? `${buf} ${word}` : word;
    }
  }
  if (buf) pieces.push(buf);
  return pieces;
}
