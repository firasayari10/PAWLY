import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";

// GET /api/bookings/history — the owner's finished bookings:
// refused, cancelled, or a confirmed stay whose end date has passed.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();

  const { data: me, error: meError } = await supabase
    .from("utilisateur")
    .select("id_user")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (meError) return NextResponse.json({ error: meError.message }, { status: 500 });
  if (!me) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });

  const { data: rows, error } = await supabase
    .from("offre_garde")
    .select(`
      id, type_animal, nom_animal, nb_animaux,
      date_debut, date_fin, message, statut, tarif_total,
      statut_paiement, paid_at, annule_at, created_at,
      prestataire:prestataire_id ( id_user, prenom, nom, email, photo_profil ),
      avis:avis_offre ( id, note, commentaire, created_at )
    `)
    .eq("proprietaire_id", me.id_user)
    .order("date_fin", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const history = (rows ?? []).filter((b) => {
    if (b.statut === "refuse" || b.statut === "annule") return true;
    // A confirmed booking belongs to history once the stay has ended.
    return new Date(b.date_fin).getTime() < todayStart.getTime();
  });

  return NextResponse.json({ history });
}
