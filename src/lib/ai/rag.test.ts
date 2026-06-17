import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildContextBlock,
  extractSources,
  buildGroundedUserMessage,
  MAX_CONTEXT_CHARS,
  type RetrievedChunk,
} from "./rag";

const chunk = (over: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  id: "1",
  content: "Contenu.",
  title: "Titre",
  category: "sante",
  source: "pawly-kb",
  ...over,
});

describe("buildSystemPrompt", () => {
  it("includes the vet guardrail and French scope", () => {
    const p = buildSystemPrompt();
    expect(p).toMatch(/vétérinaire/i);
    expect(p).toMatch(/français/i);
    expect(p).toMatch(/Pawly Assistant/);
  });

  it("greets the user by name when provided", () => {
    expect(buildSystemPrompt("Firas")).toContain("Firas");
  });
});

describe("buildContextBlock", () => {
  it("returns a placeholder when there are no chunks", () => {
    expect(buildContextBlock([])).toMatch(/aucun document/i);
  });

  it("numbers chunks starting at 1 with title and source", () => {
    const block = buildContextBlock([chunk({ title: "A" }), chunk({ id: "2", title: "B" })]);
    expect(block).toContain("[1] A (pawly-kb)");
    expect(block).toContain("[2] B (pawly-kb)");
  });

  it("truncates to the context budget but always keeps at least one chunk", () => {
    const big = chunk({ content: "x".repeat(MAX_CONTEXT_CHARS * 2) });
    const block = buildContextBlock([big, chunk({ id: "2", title: "Second" })]);
    expect(block).toContain("[1]");
    expect(block).not.toContain("[2] Second");
  });
});

describe("extractSources", () => {
  it("dedupes by title+source", () => {
    const sources = extractSources([
      chunk({ title: "A", source: "s" }),
      chunk({ id: "2", title: "A", source: "s" }),
      chunk({ id: "3", title: "B", source: "s" }),
    ]);
    expect(sources.map((s) => s.title)).toEqual(["A", "B"]);
  });
});

describe("buildGroundedUserMessage", () => {
  it("embeds both the context and the question", () => {
    const msg = buildGroundedUserMessage("Mon chat tousse ?", [chunk()]);
    expect(msg).toContain("CONTEXTE");
    expect(msg).toContain("QUESTION");
    expect(msg).toContain("Mon chat tousse ?");
  });
});
