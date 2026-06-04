import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const contenu = formData.get("contenu") as string;
    const gardeId = formData.get("gardeId") as string;
    const prestataireId = formData.get("prestataireId") as string;
    const proprietaireId = formData.get("proprietaireId") as string;
    const photos = formData.getAll("photos") as File[];

    // 获取 prestataire 信息用于通知
    const { data: prestataire } = await supabase
      .from("utilisateur")
      .select("prenom, nom")
      .eq("clerk_id", prestataireId)
      .single();

    // 获取 animal 信息（如果有）
    const { data: gardeInfo } = await supabase
      .from("gardes")
      .select("animal_nom")
      .eq("id", gardeId)
      .single();

    const prestataireNom = prestataire 
      ? `${prestataire.prenom || ""} ${prestataire.nom || ""}`.trim() || "Le gardien"
      : "Le gardien";

    const animalNom = gardeInfo?.animal_nom || "votre animal";

    // 上传图片到 Supabase Storage
    const photoUrls: string[] = [];
    for (const photo of photos) {
      const fileName = `journal/${Date.now()}_${photo.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pawly-docs")
        .upload(fileName, photo);

      if (uploadError) {
        console.error("[UPLOAD_ERROR]", uploadError);
        continue;
      }

      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from("pawly-docs")
          .getPublicUrl(fileName);
        photoUrls.push(publicUrl);
      }
    }

    const { data, error } = await supabase
      .from("journal_entries")
      .insert([{
        contenu,
        garde_id: gardeId,
        prestataire_id: prestataireId,
        proprietaire_id: proprietaireId,
        photos: photoUrls,
        date_creation: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // ✅ 发送通知给宠物主人
    if (proprietaireId && proprietaireId !== "") {
      await createNotification({
        userId: proprietaireId,
        title: "📔 Nouvelles de votre animal !",
        body: `${prestataireNom} a publié une mise à jour sur ${animalNom}.`,
        type: "journal",
        relatedId: data.id,
      });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (error: any) {
    console.error("[JOURNAL_CREATE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}