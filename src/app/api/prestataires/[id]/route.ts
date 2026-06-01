import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: user, error: userError } = await supabase
    .from("utilisateur")
    .select(`
      id_user, prenom, nom, ville, code_postal, adresse,
      latitude, longitude, photo_profil, statut_compte,
      prestataire_profil (
        id, bio, tarif_jour, types_animaux,
        rayon_km, annees_experience, note_moyenne, nb_avis, disponible
      )
    `)
    .eq("id_user", id)
    .eq("role", "prestataire")
    .maybeSingle();

  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });
  if (!user)     return NextResponse.json({ error: "Not found" }, { status: 404 });

  const profil = Array.isArray((user as any).prestataire_profil)
    ? (user as any).prestataire_profil[0]
    : (user as any).prestataire_profil;

  // Reviews for this prestataire, with the author's first name + initial.
  const { data: avis } = await supabase
    .from("avis_offre")
    .select(`
      id, note, commentaire, created_at,
      auteur:proprietaire_id ( prenom, nom )
    `)
    .eq("prestataire_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ prestataire: { ...(user as any), profil }, avis: avis ?? [] });
}
