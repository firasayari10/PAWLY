// ============================================================
// PAWLY — Azure AI Search client + RAG retrieval
// Wraps the AI Search SDK: builds the client from env and runs a hybrid
// (keyword + vector) query for the assistant's grounding context.
// ============================================================

import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { embed } from "./azure-openai";
import type { RetrievedChunk } from "./rag";

/** Shape of a document stored in (and returned from) the AI Search index. */
export interface KbDocument {
  id: string;
  content: string;
  title: string;
  category: string;
  source: string;
  contentVector?: number[];
}

export const VECTOR_FIELD = "contentVector";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export const INDEX_NAME = process.env.AZURE_SEARCH_INDEX_NAME ?? "pawly-kb";

/** Build a SearchClient against the KB index from the environment. */
export function getSearchClient(): SearchClient<KbDocument> {
  return new SearchClient<KbDocument>(
    requireEnv("AZURE_SEARCH_ENDPOINT"),
    INDEX_NAME,
    new AzureKeyCredential(requireEnv("AZURE_SEARCH_API_KEY")),
  );
}

/**
 * Hybrid retrieval: embeds the query and runs keyword + vector search, then
 * returns the top-k chunks ranked by AI Search. Returns [] on any failure so
 * the assistant degrades to an honest "no context" answer rather than erroring.
 */
export async function retrieve(query: string, k = 5): Promise<RetrievedChunk[]> {
  try {
    const [vector] = await embed([query]);
    const client = getSearchClient();

    const results = await client.search(query, {
      top: k,
      select: ["id", "content", "title", "category", "source"],
      vectorSearchOptions: {
        queries: [
          {
            kind: "vector",
            vector,
            fields: [VECTOR_FIELD],
            kNearestNeighborsCount: k,
          },
        ],
      },
    });

    const chunks: RetrievedChunk[] = [];
    for await (const r of results.results) {
      const d = r.document;
      chunks.push({
        id: d.id,
        content: d.content,
        title: d.title,
        category: d.category,
        source: d.source,
        score: r.score,
      });
    }
    return chunks;
  } catch (e) {
    console.error("[ai/search] retrieve failed:", e);
    return [];
  }
}
