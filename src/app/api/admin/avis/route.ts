import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 获取所有被举报的评论
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("avis")
      .select(`
        *,
        auteur:utilisateur!auteur_id(prenom, nom, email)
      `)
      .eq("signale", true);

    if (error) throw error;

    return NextResponse.json({ signalements: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 处理举报（删除或忽略）
export async function DELETE(request: Request) {
  try {
    const { avisId, action } = await request.json();

    if (action === "supprimer") {
      const { error } = await supabase
        .from("avis")
        .update({ statut: "supprime", signale: false })
        .eq("id", avisId);

      if (error) throw error;
    } else if (action === "ignorer") {
      const { error } = await supabase
        .from("avis")
        .update({ signale: false, statut: "actif" })
        .eq("id", avisId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}