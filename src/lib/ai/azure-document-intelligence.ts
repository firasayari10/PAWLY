// ============================================================
// PAWLY — Azure AI Document Intelligence client factory
// Server-only. Reads the Document Intelligence endpoint + key from the
// environment and runs prebuilt models (idDocument / read) for OCR and
// structured ID extraction.
//
// CONFIDENTIALITY: this module is never imported client-side. Document bytes are
// passed straight through to Azure and never persisted or logged by us.
// ============================================================

import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
  type AnalyzeOperationOutput,
  type AnalyzeResultOutput,
  type DocumentIntelligenceClient,
} from "@azure-rest/ai-document-intelligence";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

/** Build a configured Document Intelligence client from the environment. */
export function getDocumentIntelligence(): DocumentIntelligenceClient {
  return DocumentIntelligence(requireEnv("AZURE_DOCINTEL_ENDPOINT"), {
    key: requireEnv("AZURE_DOCINTEL_KEY"),
  });
}

export type PrebuiltModel = "prebuilt-idDocument" | "prebuilt-read";

/**
 * Analyse a base64-encoded document with a prebuilt model and return the result.
 * Throws on an Azure error response or analysis failure.
 */
export async function analyzeDocument(
  modelId: PrebuiltModel,
  base64Source: string,
  client = getDocumentIntelligence(),
): Promise<AnalyzeResultOutput | undefined> {
  const initial = await client
    .path("/documentModels/{modelId}:analyze", modelId)
    .post({ contentType: "application/json", body: { base64Source } });

  if (isUnexpected(initial)) {
    throw new Error(initial.body.error?.message ?? "Échec de l'analyse Azure.");
  }

  const poller = getLongRunningPoller(client, initial);
  const result = (await poller.pollUntilDone()).body as AnalyzeOperationOutput;

  if (result.status !== "succeeded") {
    throw new Error(result.error?.message ?? "L'analyse du document n'a pas abouti.");
  }
  return result.analyzeResult;
}
