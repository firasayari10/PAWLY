"use client";

/**
 * OcrUpload — composant d'upload de document avec OCR.
 *
 * Le document est envoyé à notre route serveur `/api/profile/ocr`, qui l'analyse
 * via Azure Document Intelligence avec une clé secrète (jamais exposée au
 * navigateur) puis ne renvoie que les champs extraits. Le fichier n'est pas
 * conservé.
 *
 * Usage :
 *   <OcrUpload
 *     type="identite"           // ou "assurance"
 *     onExtracted={(fields) => setFormValues(fields)}
 *   />
 *
 * onExtracted reçoit un objet partiel avec les champs détectés :
 *   { prenom, nom, adresse, code_postal, ville }
 */

import { useRef, useState } from "react";
import { FileText, Loader2, ScanLine, UploadCloud, X } from "lucide-react";
import type { OcrFields } from "@/lib/ocr-parse";

export type { OcrFields };

type Props = {
  type: "identite" | "assurance";
  onExtracted: (fields: OcrFields) => void;
};

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 Mo
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function OcrUpload({ type, onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const label = type === "identite" ? "carte d'identité" : "attestation d'assurance";

  async function processFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMsg("Merci de fournir une image (JPG, PNG, WEBP) ou un PDF.");
      setStatus("error");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg("Fichier trop volumineux (4 Mo maximum).");
      setStatus("error");
      return;
    }

    setFileName(file.name);
    setStatus("loading");
    setErrorMsg(null);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);

      const res = await fetch("/api/profile/ocr", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur serveur lors de l'analyse.");
      }

      const { fields } = (await res.json()) as { fields: OcrFields };
      onExtracted(fields);
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue.");
      setStatus("error");
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = ""; // reset pour permettre re-upload du même fichier
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function reset() {
    setStatus("idle");
    setPreview(null);
    setFileName(null);
    setErrorMsg(null);
  }

  return (
    <div className="w-full space-y-3">
      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => status === "idle" && inputRef.current?.click()}
        className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition
          ${dragging
            ? "border-teal-500 bg-teal-50/60 dark:border-teal-400 dark:bg-teal-900/20"
            : status === "done"
              ? "border-teal-400 bg-teal-50/40 dark:border-teal-600 dark:bg-teal-900/10"
              : status === "error"
                ? "border-red-300 bg-red-50/40 dark:border-red-700/60 dark:bg-red-900/10"
                : "border-zinc-300 bg-zinc-50/60 hover:border-teal-400 hover:bg-teal-50/30 dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:border-teal-500"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={onFileChange}
          className="sr-only"
          aria-label={`Uploader votre ${label}`}
        />

        {status === "idle" && (
          <>
            <UploadCloud className="h-8 w-8 text-zinc-400 dark:text-zinc-500" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Déposez votre {label}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">JPG, PNG, WEBP ou PDF · Max 4 Mo</p>
            </div>
          </>
        )}

        {status === "loading" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Analyse en cours…
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">Extraction sécurisée du texte</p>
            </div>
          </>
        )}

        {status === "done" && (
          <>
            <ScanLine className="h-8 w-8 text-teal-500" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                Champs remplis automatiquement ✓
              </p>
              {fileName && (
                <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-zinc-400">
                  <FileText className="h-3 w-3" aria-hidden /> {fileName}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-600 dark:hover:bg-zinc-700"
              aria-label="Réinitialiser"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              Impossible d&apos;analyser le document
            </p>
            {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="mt-1 rounded-xl border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-700/50 dark:text-red-400"
            >
              Réessayer
            </button>
          </>
        )}
      </div>

      {/* Aperçu image */}
      {preview && status !== "idle" && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Aperçu du document" className="max-h-48 w-full object-contain" />
        </div>
      )}

      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
        Vos documents sont analysés de manière sécurisée et ne sont pas conservés.
        Vérifiez les champs pré-remplis avant de sauvegarder.
      </p>
    </div>
  );
}
