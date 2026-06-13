import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";

// GET /api/bookings/history — the owner's finished bookings:
// refused, cancelled, or a confirmed stay whose end date has passed.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

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
