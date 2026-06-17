// ============================================================
// PAWLY — Extraction d'adresse par LLM (Azure OpenAI)
// Server-only. À partir du texte OCR brut d'une attestation d'assurance
// (produit par Azure Document Intelligence `prebuilt-read`), demande à
// gpt-4o-mini de renvoyer l'adresse de l'assuré en JSON structuré.
//
// CONFIDENTIALITÉ : le texte (PII) est envoyé à Azure OpenAI — même ressource
// que l'assistant, sans rétention/entraînement par défaut. Ne jamais journaliser
// le texte ni les champs extraits.
// ============================================================

import type { AzureOpenAI } from "openai";
import { getOpenAI, CHAT_DEPLOYMENT } from "./azure-openai";
import { parseAddressJson, type OcrFields } from "@/lib/ocr-parse";

const SYSTEM_PROMPT = `Tu extrais l'adresse postale de l'ASSURÉ depuis le texte OCR d'une attestation d'assurance française.
Règles :
- Renvoie UNIQUEMENT du JSON valide : {"adresse": string|null, "code_postal": string|null, "ville": string|null}.
- "adresse" = numéro + voie (ex : "12 rue des Lilas"), sans le code postal ni la ville.
- "code_postal" = exactement 5 chiffres.
- Choisis l'adresse de l'assuré (titulaire du contrat / du risque), jamais celle de la compagnie d'assurance.
- Si une information est absente ou incertaine, mets null. N'invente rien.`;

/**
 * Extrait {adresse, code_postal, ville} depuis le texte OCR via gpt-4o-mini.
 * Retourne {} si le texte est vide ou en cas d'échec (la route bascule alors
 * sur le repli regex).
 */
export async function extractAddressFromText(
  text: string,
  client: AzureOpenAI = getOpenAI(),
): Promise<OcrFields> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    const completion = await client.chat.completions.create({
      model: CHAT_DEPLOYMENT,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed.slice(0, 6000) },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return {};
    return parseAddressJson(JSON.parse(content));
  } catch {
    // Erreur LLM / JSON invalide / clé manquante → repli regex côté appelant.
    return {};
  }
}
