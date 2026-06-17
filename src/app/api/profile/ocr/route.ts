// ============================================================
// PAWLY — POST /api/profile/ocr
// Server-side OCR proxy. The browser uploads an identity card or insurance
// attestation; we run Azure Document Intelligence with our secret key and return
// ONLY the extracted form fields. The image is held in memory, sent to Azure,
// then discarded — never stored, and never logged.
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/ai/azure-document-intelligence";
import { extractAddressFromText } from "@/lib/ai/address-extract";
import { mapIdDocumentFields, parseAddress, parseReadText, type OcrFields } from "@/lib/ocr-parse";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // 4 Mo
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const file = form.get("file");
  const type = form.get("type");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  }
  if (type !== "identite" && type !== "assurance") {
    return NextResponse.json({ error: "Type de document invalide." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté (JPG, PNG, WEBP ou PDF)." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (4 Mo maximum)." }, { status: 413 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    let fields: OcrFields;

    if (type === "identite") {
      // Structured extraction (FirstName / LastName / Address + confidence).
      const result = await analyzeDocument("prebuilt-idDocument", base64);
      fields = mapIdDocumentFields(result?.documents?.[0]?.fields);
      // Fall back to text heuristics if the model returned no usable name.
      if (!fields.nom && !fields.prenom && result?.content) {
        fields = { ...parseReadText(result.content), ...fields };
      }
    } else {
      // Insurance attestation: OCR text → LLM address extraction, with the regex
      // heuristics as a base/fallback (LLM values win when present).
      const result = await analyzeDocument("prebuilt-read", base64);
      const text = result?.content ?? "";
      fields = { ...parseAddress(text), ...(await extractAddressFromText(text)) };
    }

    return NextResponse.json({ fields });
  } catch (e) {
    // Log the failure cause only — never the document bytes or extracted PII.
    console.error("[OCR] analyse échouée:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json(
      { error: "Analyse du document impossible. Réessayez." },
      { status: 502 },
    );
  }
}
