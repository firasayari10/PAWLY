// ============================================================
// PAWLY — OCR field extraction / filtering
// Pure functions (no I/O) that turn Azure Document Intelligence output into the
// profile form fields. Kept side-effect-free so they can be unit-tested.
// NOTE: callers must never log the returned values — they are PII.
// ============================================================

export type OcrFields = {
  prenom?: string;
  nom?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
};

/** Minimum per-field confidence (0–1) below which a structured field is dropped. */
export const CONFIDENCE_MIN = 0.5;

/** Structural subset of Azure's DocumentFieldOutput we actually read. */
type FieldLike = {
  valueString?: string;
  content?: string;
  confidence?: number;
  valueAddress?: {
    houseNumber?: string;
    road?: string;
    streetAddress?: string;
    postalCode?: string;
    city?: string;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Title-case a string, handling accents, hyphens and apostrophes. */
export function capitalize(s: string): string {
  return s
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s\-'])([a-zà-ÿ])/g, (_, sep, c) => sep + c.toLocaleUpperCase("fr-FR"));
}

function clean(s: string | undefined): string | undefined {
  const t = s?.replace(/\s{2,}/g, " ").trim();
  return t ? t : undefined;
}

function normalizeKey(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

// ── Azure prebuilt-idDocument → OcrFields (structured, preferred path) ─────────

/**
 * Map the structured fields of a `prebuilt-idDocument` analysis into form
 * fields, dropping anything below {@link CONFIDENCE_MIN}.
 */
export function mapIdDocumentFields(
  fields: Record<string, FieldLike> | undefined,
): OcrFields {
  const out: OcrFields = {};
  if (!fields) return out;

  const pick = (f: FieldLike | undefined): string | undefined =>
    f && (f.confidence ?? 1) >= CONFIDENCE_MIN ? clean(f.valueString ?? f.content) : undefined;

  const first = pick(fields.FirstName);
  const last = pick(fields.LastName);
  if (first) out.prenom = capitalize(first);
  if (last) out.nom = capitalize(last);

  const addrField = fields.Address;
  if (addrField && (addrField.confidence ?? 1) >= CONFIDENCE_MIN) {
    const a = addrField.valueAddress;
    if (a) {
      const street = clean(a.streetAddress) ?? clean([a.houseNumber, a.road].filter(Boolean).join(" "));
      if (street) out.adresse = street;
      if (clean(a.postalCode)) out.code_postal = clean(a.postalCode);
      if (clean(a.city)) out.ville = capitalize(clean(a.city)!);
    } else if (clean(addrField.content)) {
      // No structured AddressValue — fall back to text parsing of the raw address.
      Object.assign(out, parseAddress(clean(addrField.content)!));
    }
  }
  return out;
}

// ── Raw OCR text → OcrFields (prebuilt-read / fallback heuristics) ─────────────

const NAME_STOPWORDS = new Set([
  "REPUBLIQUE", "FRANCAISE", "FRANCE", "CARTE", "NATIONALE", "IDENTITE", "CNI",
  "NOM", "NON", "PRENOM", "PRENOMS", "SEXE", "NEE", "NE", "LE", "VALABLE", "VALABE",
  "JUSQU", "JUSQUAU", "SIGNATURE", "PASSEPORT", "MASCULIN", "FEMININ", "UNION",
  "EUROPEENNE", "ATTESTATION", "ASSURANCE", "HABITATION", "ASSURE", "MONSIEUR",
  "MADAME", "CONTRAT", "NUMERO", "POLICE",
]);

const NAME_TOKEN = /[A-ZÀ-Ÿ]{3,}(?:-[A-ZÀ-Ÿ]{2,})*/g;

function cleanLine(l: string): string {
  return l.replace(/[|#«»…]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

/** Extract adresse / code_postal / ville from a free-text block. */
export function parseAddress(raw: string): OcrFields {
  const out: OcrFields = {};
  const lines = raw.split("\n").map(cleanLine).filter(Boolean);

  const cpVille = raw.match(/\b(\d{5})\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ'\s\-]{1,40})/);
  if (cpVille) {
    out.code_postal = cpVille[1];
    out.ville = capitalize(cpVille[2].split(/\s{2,}|\n/)[0].trim());
  }

  const adresse = lines.find((l) =>
    /\b\d+[\s,]*(?:rue|avenue|av|boulevard|bd|all[ée]+e|impasse|chemin|voie|route|place|r[ée]sidence|quai|cours)\b/i.test(l),
  );
  if (adresse) out.adresse = adresse;

  return out;
}

/**
 * Validate & normalise the JSON address an LLM returns for an insurance
 * attestation. Pure (no I/O) so it can be unit-tested. Tolerant of `null`/empty
 * values and unexpected shapes — anything invalid is simply dropped.
 */
export function parseAddressJson(raw: unknown): OcrFields {
  const out: OcrFields = {};
  if (!raw || typeof raw !== "object") return out;

  const obj = raw as Record<string, unknown>;
  const str = (v: unknown): string | undefined => (typeof v === "string" ? clean(v) : undefined);

  const adresse = str(obj.adresse);
  if (adresse) out.adresse = adresse;

  const cp = str(obj.code_postal);
  if (cp && /^\d{5}$/.test(cp)) out.code_postal = cp;

  const ville = str(obj.ville);
  if (ville) out.ville = capitalize(ville);

  return out;
}

/**
 * Best-effort extraction from raw OCR text (used for the insurance document and
 * as a fallback when structured ID fields are unavailable). Heuristic — the user
 * always reviews the pre-filled values before saving.
 */
export function parseReadText(raw: string): OcrFields {
  const out: OcrFields = { ...parseAddress(raw) };
  const lines = raw.split("\n").map(cleanLine).filter(Boolean);
  const isName = (t: string | undefined): t is string => !!t && !NAME_STOPWORDS.has(normalizeKey(t));
  const villeKey = out.ville ? normalizeKey(out.ville) : null;
  const notVille = (t: string) => normalizeKey(t) !== villeKey;

  let nom: string | undefined;
  let prenom: string | undefined;

  // Label-anchored NOM (tolerant of Nom/Non/N0M + junk before the value).
  for (const l of lines) {
    const m = l.match(/\bN[O0][NM]\b[^A-Za-zÀ-ÿ]*([A-ZÀ-Ÿ][A-ZÀ-Ÿ'\-]{2,20})/);
    if (m && isName(m[1]) && notVille(m[1])) { nom = m[1]; break; }
  }
  // Label-anchored PRÉNOM.
  for (const l of lines) {
    const m = l.match(/\bpr[eé]nom?s?\b[^A-Za-zÀ-ÿ]*([A-ZÀ-Ÿ][A-ZÀ-Ÿ'\-]{2,20})/i);
    if (m && isName(m[1]) && m[1] !== nom && notVille(m[1])) { prenom = m[1]; break; }
  }
  // Positional fallback: first uppercase name tokens in reading order.
  if (!nom || !prenom) {
    const toks = (raw.match(NAME_TOKEN) ?? []).filter((t) => isName(t) && notVille(t));
    if (!nom && toks[0]) nom = toks[0];
    if (!prenom) {
      const p = toks.find((t) => t !== nom);
      if (p) prenom = p;
    }
  }

  if (nom) out.nom = capitalize(nom);
  if (prenom) out.prenom = capitalize(prenom);
  return out;
}
