// ============================================================
// PAWLY — Knowledge-base ingestion into Azure AI Search
// Reads data/knowledge-base/*.md, chunks + embeds each file, and upserts the
// documents into the AI Search index (creating the index if needed).
//
// Run with:  bun run ingest:kb     (or: bunx tsx scripts/ingest-kb.ts)
// Requires the AZURE_OPENAI_* and AZURE_SEARCH_* variables (see .env.example).
// Idempotent: document ids are deterministic, so re-running upserts in place.
// ============================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  SearchIndexClient,
  SearchClient,
  AzureKeyCredential,
  type SearchIndex,
} from "@azure/search-documents";
import { chunkText, parseFrontmatter } from "../src/lib/ai/chunk";
import { embed, EMBEDDING_DIMENSIONS } from "../src/lib/ai/azure-openai";
import type { KbDocument } from "../src/lib/ai/search";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Minimal .env.local loader (a standalone script doesn't get Next's env loading).
function loadEnv(): void {
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    process.env[key] = m[2].replace(/^["']|["']$/g, "");
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

const KB_DIR = join(ROOT, "data", "knowledge-base");
const VECTOR_PROFILE = "hnsw-profile";
const SEMANTIC_CONFIG = "default-semantic";

function buildIndexDefinition(name: string): SearchIndex {
  return {
    name,
    fields: [
      { name: "id", type: "Edm.String", key: true, filterable: true },
      { name: "content", type: "Edm.String", searchable: true, analyzerName: "fr.lucene" },
      { name: "title", type: "Edm.String", searchable: true, filterable: true },
      { name: "category", type: "Edm.String", filterable: true, facetable: true },
      { name: "source", type: "Edm.String", filterable: true },
      {
        name: "contentVector",
        type: "Collection(Edm.Single)",
        searchable: true,
        vectorSearchDimensions: EMBEDDING_DIMENSIONS,
        vectorSearchProfileName: VECTOR_PROFILE,
      },
    ],
    vectorSearch: {
      algorithms: [{ name: "hnsw-algo", kind: "hnsw" }],
      profiles: [{ name: VECTOR_PROFILE, algorithmConfigurationName: "hnsw-algo" }],
    },
    semanticSearch: {
      configurations: [
        {
          name: SEMANTIC_CONFIG,
          prioritizedFields: {
            titleField: { name: "title" },
            contentFields: [{ name: "content" }],
            keywordsFields: [{ name: "category" }],
          },
        },
      ],
    },
  };
}

function docId(file: string, index: number): string {
  return createHash("sha1").update(`${file}#${index}`).digest("hex");
}

async function main(): Promise<void> {
  loadEnv();

  const endpoint = requireEnv("AZURE_SEARCH_ENDPOINT");
  const apiKey = requireEnv("AZURE_SEARCH_API_KEY");
  const indexName = process.env.AZURE_SEARCH_INDEX_NAME ?? "pawly-kb";
  requireEnv("AZURE_OPENAI_ENDPOINT");
  requireEnv("AZURE_OPENAI_API_KEY");

  const credential = new AzureKeyCredential(apiKey);

  // 1. Ensure the index exists / is up to date.
  console.log(`→ Index « ${indexName} » : création / mise à jour…`);
  const indexClient = new SearchIndexClient(endpoint, credential);
  await indexClient.createOrUpdateIndex(buildIndexDefinition(indexName));

  // 2. Read + chunk every KB file.
  if (!existsSync(KB_DIR)) throw new Error(`Dossier introuvable : ${KB_DIR}`);
  const files = readdirSync(KB_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) throw new Error("Aucun fichier .md dans data/knowledge-base/");

  const docs: KbDocument[] = [];
  for (const file of files) {
    const raw = readFileSync(join(KB_DIR, file), "utf8");
    const { meta, body } = parseFrontmatter(raw, basename(file, ".md"));
    const chunks = chunkText(body);
    chunks.forEach((content, i) => {
      docs.push({
        id: docId(file, i),
        content,
        title: meta.title,
        category: meta.category,
        source: meta.source,
      });
    });
    console.log(`  • ${file} → ${chunks.length} chunk(s)`);
  }

  // 3. Embed in batches and attach vectors.
  console.log(`→ Embeddings de ${docs.length} chunk(s)…`);
  const BATCH = 16;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const vectors = await embed(batch.map((d) => d.content));
    batch.forEach((d, j) => {
      d.contentVector = vectors[j];
    });
  }

  // 4. Upload (merge-or-upload = upsert).
  console.log("→ Envoi vers Azure AI Search…");
  const searchClient = new SearchClient<KbDocument>(endpoint, indexName, credential);
  const result = await searchClient.mergeOrUploadDocuments(docs);
  const failed = result.results.filter((r) => !r.succeeded);
  if (failed.length > 0) {
    console.error(`✗ ${failed.length} document(s) en échec`, failed.slice(0, 3));
    process.exit(1);
  }

  console.log(`✓ Ingestion terminée : ${docs.length} document(s) indexé(s).`);
}

main().catch((e) => {
  console.error("✗ Échec de l'ingestion :", e);
  process.exit(1);
});
