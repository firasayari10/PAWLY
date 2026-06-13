import { describe, it, expect } from "vitest";
import {
  validateJournalInput,
  validateEntryInput,
  canAddEntry,
  entryAuthzError,
  slugify,
  slugifyBase,
  sanitizeFilename,
  buildPhotoPath,
  validatePhotoCount,
  validatePhotoFile,
  flattenPublicJournals,
  filterPosts,
  MAX_PHOTOS_PER_ENTRY,
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
} from "./journal";

describe("validateJournalInput", () => {
  it("requires a title", () => {
    expect(validateJournalInput({ nom_animal: "Rex" })).toMatch(/titre/i);
  });

  it("requires an animal name", () => {
    expect(validateJournalInput({ titre: "Vacances de Rex" })).toMatch(/animal/i);
  });

  it("rejects an over-long title", () => {
    expect(
      validateJournalInput({ titre: "x".repeat(MAX_TITLE_LENGTH + 1), nom_animal: "Rex" }),
    ).toMatch(/dépasser/i);
  });

  it("accepts a valid journal", () => {
    expect(validateJournalInput({ titre: "Carnet de Rex", nom_animal: "Rex", type_animal: "chien" })).toBeNull();
  });
});

describe("validateEntryInput", () => {
  it("requires a title", () => {
    expect(validateEntryInput({ contenu: "Belle journée" })).toMatch(/titre/i);
  });

  it("rejects an over-long body", () => {
    expect(validateEntryInput({ titre: "Jour 1", contenu: "x".repeat(MAX_CONTENT_LENGTH + 1) })).toMatch(/contenu/i);
  });

  it("accepts a valid entry with empty body", () => {
    expect(validateEntryInput({ titre: "Jour 1" })).toBeNull();
  });
});

describe("canAddEntry / entryAuthzError", () => {
  it("allows the owner", () => {
    expect(canAddEntry({ isOwner: true, isBookingSitter: false })).toBe(true);
    expect(entryAuthzError({ isOwner: true, isBookingSitter: false })).toBeNull();
  });

  it("allows a sitter on an accepted booking", () => {
    expect(canAddEntry({ isOwner: false, isBookingSitter: true })).toBe(true);
    expect(entryAuthzError({ isOwner: false, isBookingSitter: true })).toBeNull();
  });

  it("rejects anyone else", () => {
    expect(canAddEntry({ isOwner: false, isBookingSitter: false })).toBe(false);
    expect(entryAuthzError({ isOwner: false, isBookingSitter: false })).toMatch(/autoris/i);
  });
});

describe("slugify", () => {
  it("strips accents and lowercases", () => {
    expect(slugifyBase("Carnet de Réx à Paris")).toBe("carnet-de-rex-a-paris");
  });

  it("appends the suffix deterministically", () => {
    expect(slugify("Carnet de Rex", "ab12")).toBe("carnet-de-rex-ab12");
  });

  it("falls back to 'journal' for empty bases", () => {
    expect(slugify("***", "x9")).toBe("journal-x9");
  });
});

describe("sanitizeFilename / buildPhotoPath", () => {
  it("replaces unsafe characters", () => {
    expect(sanitizeFilename("mon chien (été).JPG")).toBe("mon_chien_ete_.JPG");
  });

  it("builds a path under the journal id", () => {
    expect(buildPhotoPath("j1", "photo é.png", "k0")).toBe("j1/k0-photo_e.png");
  });
});

describe("validatePhotoCount", () => {
  it("allows up to the max", () => {
    expect(validatePhotoCount(MAX_PHOTOS_PER_ENTRY)).toBeNull();
  });

  it("rejects beyond the max", () => {
    expect(validatePhotoCount(MAX_PHOTOS_PER_ENTRY + 1)).toMatch(/photos/i);
  });
});

describe("validatePhotoFile", () => {
  it("accepts a small jpeg", () => {
    expect(validatePhotoFile({ type: "image/jpeg", size: 1000 })).toBeNull();
  });

  it("rejects a non-image type", () => {
    expect(validatePhotoFile({ type: "application/pdf", size: 1000 })).toMatch(/format/i);
  });

  it("rejects an oversized image", () => {
    expect(validatePhotoFile({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 Mo/i);
  });
});

const PUBLIC_JOURNALS = [
  {
    titre: "Les vacances de Réx",
    nom_animal: "Rex",
    type_animal: "chien",
    public_slug: "rex-1",
    proprietaire: { prenom: "Sarah" },
    journal_entry: [
      { id: "e1", titre: "Jour 1", contenu: "Promenade", created_at: "2026-05-01T10:00:00Z", journal_photo: [{ id: "p1", url: "u1" }] },
      { id: "e2", titre: "Jour 2", contenu: "Sieste", created_at: "2026-05-03T10:00:00Z", journal_photo: [] },
    ],
  },
  {
    titre: "Carnet de Mochi",
    nom_animal: "Mochi",
    type_animal: "chat",
    public_slug: "mochi-9",
    proprietaire: [{ prenom: "Leo" }],
    journal_entry: [
      { id: "e3", titre: "Arrivée", contenu: "", created_at: "2026-05-02T10:00:00Z", journal_photo: [] },
    ],
  },
];

describe("flattenPublicJournals", () => {
  it("produces one post per entry with journal + author context", () => {
    const posts = flattenPublicJournals(PUBLIC_JOURNALS);
    expect(posts).toHaveLength(3);
    const e1 = posts.find((p) => p.entryId === "e1")!;
    expect(e1).toMatchObject({ journalTitre: "Les vacances de Réx", auteurPrenom: "Sarah", publicSlug: "rex-1" });
    expect(e1.photos).toHaveLength(1);
  });

  it("handles proprietaire as array or object", () => {
    const posts = flattenPublicJournals(PUBLIC_JOURNALS);
    expect(posts.find((p) => p.entryId === "e3")!.auteurPrenom).toBe("Leo");
  });
});

describe("filterPosts", () => {
  it("sorts newest-first by default", () => {
    const posts = filterPosts(flattenPublicJournals(PUBLIC_JOURNALS), {});
    expect(posts.map((p) => p.entryId)).toEqual(["e2", "e3", "e1"]);
  });

  it("filters by journal title (accent-insensitive substring)", () => {
    const posts = filterPosts(flattenPublicJournals(PUBLIC_JOURNALS), { q: "rex" });
    expect(posts.every((p) => p.journalTitre.includes("Réx"))).toBe(true);
    expect(posts).toHaveLength(2);
  });

  it("filters by exact day", () => {
    const posts = filterPosts(flattenPublicJournals(PUBLIC_JOURNALS), { date: "2026-05-03" });
    expect(posts).toHaveLength(1);
    expect(posts[0].entryId).toBe("e2");
  });

  it("combines title and date filters", () => {
    const posts = filterPosts(flattenPublicJournals(PUBLIC_JOURNALS), { q: "mochi", date: "2026-05-02" });
    expect(posts).toHaveLength(1);
    expect(posts[0].entryId).toBe("e3");
  });
});
