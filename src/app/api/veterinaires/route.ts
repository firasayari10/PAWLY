import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { filterClinicsByVille, type Clinique } from "@/lib/veterinaires";

// GET /api/veterinaires — list veterinary clinics for the map, optional ?ville= filter.
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ville = searchParams.get("ville") ?? "";

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("veterinaire_clinique")
    .select("id, nom, adresse, ville, code_postal, telephone, email, latitude, longitude")
    .order("ville", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cliniques = filterClinicsByVille((data ?? []) as Clinique[], ville);

  return NextResponse.json({ cliniques, count: cliniques.length });
}
