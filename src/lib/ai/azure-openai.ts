// ============================================================
// PAWLY — Azure OpenAI client factory
// Single place that reads the Azure OpenAI env and builds the SDK client, used
// by both the assistant route (chat) and the ingestion script (embeddings).
// ============================================================

import { AzureOpenAI } from "openai";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

/** Deployment name of the chat model (e.g. "gpt-4o-mini"). */
export const CHAT_DEPLOYMENT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "gpt-4o-mini";

/** Deployment name of the embedding model (e.g. "text-embedding-3-small"). */
export const EMBEDDING_DEPLOYMENT =
  process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? "text-embedding-3-small";

/** Dimensions of text-embedding-3-small; must match the AI Search index. */
export const EMBEDDING_DIMENSIONS = 1536;

/** Build a configured Azure OpenAI client from the environment. */
export function getOpenAI(): AzureOpenAI {
  return new AzureOpenAI({
    endpoint: requireEnv("AZURE_OPENAI_ENDPOINT"),
    apiKey: requireEnv("AZURE_OPENAI_API_KEY"),
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
  });
}

/** Embed one or more texts, returning a vector per input (order preserved). */
export async function embed(texts: string[], client = getOpenAI()): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await client.embeddings.create({
    model: EMBEDDING_DEPLOYMENT,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
