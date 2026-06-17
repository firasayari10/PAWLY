import { describe, it, expect } from "vitest";
import { chunkText, parseFrontmatter } from "./chunk";

describe("parseFrontmatter", () => {
  it("extracts flat key/value metadata and the body", () => {
    const raw = `---\ntitle: Soins du chat\ncategory: sante\nsource: pawly-kb\nlang: fr\n---\nLe corps du document.`;
    const { meta, body } = parseFrontmatter(raw);
    expect(meta).toEqual({ title: "Soins du chat", category: "sante", source: "pawly-kb", lang: "fr" });
    expect(body).toBe("Le corps du document.");
  });

  it("strips surrounding quotes from values", () => {
    const { meta } = parseFrontmatter(`---\ntitle: "Mon titre"\n---\nx`);
    expect(meta.title).toBe("Mon titre");
  });

  it("falls back to defaults when there is no frontmatter", () => {
    const { meta, body } = parseFrontmatter("Juste du texte", "feeding.md");
    expect(meta.title).toBe("feeding.md");
    expect(meta.lang).toBe("fr");
    expect(body).toBe("Juste du texte");
  });
});

describe("chunkText", () => {
  it("returns an empty array for blank input", () => {
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps a short document as a single chunk", () => {
    const out = chunkText("Para un.\n\nPara deux.");
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("Para un.");
    expect(out[0]).toContain("Para deux.");
  });

  it("splits long text into multiple bounded chunks", () => {
    const para = Array.from({ length: 10 }, (_, i) => `Phrase numero ${i} avec du contenu.`).join(" ");
    const text = `${para}\n\n${para}\n\n${para}`;
    const out = chunkText(text, { maxChars: 200, overlapChars: 20 });
    expect(out.length).toBeGreaterThan(1);
    for (const c of out) expect(c.length).toBeLessThanOrEqual(260); // max + overlap headroom
  });

  it("hard-splits a single paragraph longer than maxChars on word boundaries", () => {
    const long = Array.from({ length: 100 }, (_, i) => `mot${i}`).join(" ");
    const out = chunkText(long, { maxChars: 50, overlapChars: 0 });
    expect(out.length).toBeGreaterThan(1);
    expect(out.join(" ")).toContain("mot0");
    expect(out.join(" ")).toContain("mot99");
  });

  it("is deterministic", () => {
    const text = "a\n\nb\n\nc\n\nd";
    expect(chunkText(text, { maxChars: 5 })).toEqual(chunkText(text, { maxChars: 5 }));
  });
});
