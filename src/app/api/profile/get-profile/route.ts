import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId manquant" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("utilisateur")
      .select("*")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (error) throw error;

    // Si l'utilisateur n'existe pas encore en BDD, on renvoie un profil vide
    // pour éviter que le front ne plante en attendant la synchro
    return NextResponse.json({ profile: data || {} });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}