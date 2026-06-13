import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";

// GET /api/bookings — the current owner's own booking requests (réservations).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const { data: bookings, error } = await supabase
    .from("offre_garde")
    .select(`
      id, type_animal, nom_animal, nb_animaux,
      date_debut, date_fin, message, statut, tarif_total,
      statut_paiement, paid_at, annule_at, created_at,
      prestataire:prestataire_id (
        id_user, prenom, nom, email, telephone, photo_profil
      ),
      avis:avis_offre ( id, note )
    `)
    .eq("proprietaire_id", me.id_user)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bookings: bookings ?? [] });
}
