// ============================================================
// PAWLY — E-journal domain logic (pure, framework-free, unit-tested)
// ============================================================

export const MAX_TITLE_LENGTH = 120;
export const MAX_CONTENT_LENGTH = 5000;
export const MAX_PHOTOS_PER_ENTRY = 6;

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

/** Validate the payload that creates a journal. Returns an error message or null. */
export function validateJournalInput(input: {
  titre?: string;
  nom_animal?: string;
  type_animal?: string;
}): string | null {
  if (!input.titre?.trim()) return "Le titre du journal est requis.";
  if (input.titre.trim().length > MAX_TITLE_LENGTH) {
    return `Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères.`;
  }
  if (!input.nom_animal?.trim()) return "Le nom de l'animal est requis.";
  if (input.nom_animal.trim().length > MAX_TITLE_LENGTH) {
    return `Le nom de l'animal ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères.`;
  }
  return null;
}

/** Validate a journal entry payload. Returns an error message or null. */
export function validateEntryInput(input: {
  titre?: string;
  contenu?: string;
}): string | null {
  if (!input.titre?.trim()) return "Le titre de l'entrée est requis.";
  if (input.titre.trim().length > MAX_TITLE_LENGTH) {
    return `Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères.`;
  }
  if ((input.contenu ?? "").length > MAX_CONTENT_LENGTH) {
    return `Le contenu ne peut pas dépasser ${MAX_CONTENT_LENGTH} caractères.`;
  }
  return null;
}

/**
 * Who may add an entry to a journal: the owner (pet diary) OR a sitter who has
 * an accepted booking referencing this owner's animal (sitter update).
 */
export function canAddEntry(ctx: { isOwner: boolean; isBookingSitter: boolean }): boolean {
  return ctx.isOwner || ctx.isBookingSitter;
}

/** Human-readable reason an author can't post, or null when they can. */
export function entryAuthzError(ctx: { isOwner: boolean; isBookingSitter: boolean }): string | null {
  if (canAddEntry(ctx)) return null;
  return "Vous n'êtes pas autorisé à écrire dans ce journal.";
}

/** Turn arbitrary text into a URL-safe slug fragment. */
export function slugifyBase(base: string): string {
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Build a public slug. `suffix` is injected (random in prod, fixed in tests) so
 * two journals named the same don't collide.
 */
export function slugify(base: string, suffix: string): string {
  const root = slugifyBase(base) || "journal";
  return `${root}-${suffix}`;
}

/** Sanitize a filename for safe use inside a storage path. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "photo";
}

/** Deterministic storage path for a journal photo. */
export function buildPhotoPath(journalId: string, filename: string, suffix: string): string {
  return `${journalId}/${suffix}-${sanitizeFilename(filename)}`;
}

/** Validate the number of photos attached to an entry. Returns error or null. */
export function validatePhotoCount(n: number): string | null {
  if (n > MAX_PHOTOS_PER_ENTRY) {
    return `Vous ne pouvez pas ajouter plus de ${MAX_PHOTOS_PER_ENTRY} photos par entrée.`;
  }
  return null;
}

/** Validate a single uploaded photo (type + size). Returns error or null. */
export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return "Format d'image non supporté (JPEG, PNG, WebP ou GIF attendu).";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Chaque photo doit faire moins de 5 Mo.";
  }
  return null;
}

// ── Public explore feed (Instagram-style) ──────────────────────────────────

export interface PublicPost {
  entryId: string;
  titre: string;
  contenu: string;
  created_at: string;
  photos: { id: string; url: string }[];
  journalTitre: string;
  nomAnimal: string;
  typeAnimal: string;
  publicSlug: string;
  auteurPrenom: string;
}

interface RawPublicJournal {
  titre?: string;
  nom_animal?: string;
  type_animal?: string;
  public_slug?: string | null;
  proprietaire?: { prenom?: string } | { prenom?: string }[] | null;
  journal_entry?: {
    id: string;
    titre?: string;
    contenu?: string;
    created_at: string;
    journal_photo?: { id: string; url: string }[];
  }[];
}

function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Flatten public journals into a flat list of posts (one per entry). */
export function flattenPublicJournals(journals: RawPublicJournal[]): PublicPost[] {
  const posts: PublicPost[] = [];
  for (const j of journals) {
    const owner = Array.isArray(j.proprietaire) ? j.proprietaire[0] : j.proprietaire;
    for (const e of j.journal_entry ?? []) {
      posts.push({
        entryId: e.id,
        titre: e.titre ?? "",
        contenu: e.contenu ?? "",
        created_at: e.created_at,
        photos: e.journal_photo ?? [],
        journalTitre: j.titre ?? "",
        nomAnimal: j.nom_animal ?? "",
        typeAnimal: j.type_animal ?? "",
        publicSlug: j.public_slug ?? "",
        auteurPrenom: owner?.prenom ?? "",
      });
    }
  }
  return posts;
}

/**
 * Filter posts by journal title (substring, accent-insensitive) and/or exact
 * day (YYYY-MM-DD), then sort newest-first.
 */
export function filterPosts(
  posts: PublicPost[],
  filters: { q?: string; date?: string },
): PublicPost[] {
  const needle = normalizeText(filters.q ?? "");
  const day = (filters.date ?? "").trim();
  return posts
    .filter((p) => (needle ? normalizeText(p.journalTitre).includes(needle) : true))
    .filter((p) => (day ? p.created_at.slice(0, 10) === day : true))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
