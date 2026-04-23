import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Client Admin pour gérer le storage et l'update utilisateur
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string; // clerk_id
    const type = formData.get("type") as "identite" | "assurance";

    if (!file || !userId) {
      return NextResponse.json({ error: "Fichier ou identifiant manquant." }, { status: 400 });
    }

    // On génère un nom de fichier unique pour éviter les collisions
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 1. Upload du fichier dans le bucket Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pawly-docs")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    // 2. Récupération de l'URL publique du fichier
    const { data: { publicUrl } } = supabase.storage
      .from("pawly-docs")
      .getPublicUrl(filePath);

    // 3. Mise à jour de la table 'utilisateur' avec le lien du document
    const updateField = type === "identite" ? "piece_identite_url" : "attestation_assurance_url";

    const { error: updateError } = await supabase
      .from("utilisateur")
      .update({ [updateField]: publicUrl })
      .eq("clerk_id", userId);

    if (updateError) throw updateError;

    return NextResponse.json({
      message: "Document téléchargé et profil mis à jour.",
      url: publicUrl
    }, { status: 200 });

  } catch (err: any) {
    console.error("[UPLOAD-API] Erreur:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}