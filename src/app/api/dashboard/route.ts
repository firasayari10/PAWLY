import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();

  // Resolve current user (and block suspended accounts).
  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;
  if (me.role !== "prestataire") return NextResponse.json({ error: "Réservé aux prestataires." }, { status: 403 });

  // Fetch all offers addressed to this prestataire, with proprietaire info
  const { data: offres, error } = await supabase
    .from("offre_garde")
    .select(`
      id, type_animal, nom_animal, nb_animaux,
      date_debut, date_fin, message, statut, tarif_total,
      statut_paiement, paid_at, created_at,
      proprietaire:proprietaire_id (
        id_user, prenom, nom, email, telephone, photo_profil
      )
    `)
    .eq("prestataire_id", me.id_user)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = offres ?? [];

  // Vet info is sensitive: only attach it for bookings this prestataire has
  // actually accepted (they are caring for the animal and may need the vet).
  type OffreRow = (typeof list)[number] & { veterinaire?: unknown };
  const ownerIdsNeedingVet = Array.from(
    new Set(
      list
        .filter((o) => o.statut === "accepte")
        .map((o) => {
          const prop = Array.isArray(o.proprietaire) ? o.proprietaire[0] : o.proprietaire;
          return prop?.id_user;
        })
        .filter((v): v is string => Boolean(v)),
    ),
  );

  if (ownerIdsNeedingVet.length > 0) {
    const { data: vets } = await supabase
      .from("info_veterinaire")
      .select("proprietaire_id, nom_veterinaire, nom_clinique, telephone, email, adresse, notes")
      .in("proprietaire_id", ownerIdsNeedingVet);

    const byOwner = new Map((vets ?? []).map((v) => [v.proprietaire_id, v]));
    for (const o of list as OffreRow[]) {
      if (o.statut !== "accepte") continue;
      const prop = Array.isArray(o.proprietaire) ? o.proprietaire[0] : o.proprietaire;
      o.veterinaire = prop?.id_user ? byOwner.get(prop.id_user) ?? null : null;
    }
  }

  return NextResponse.json({ offres: list });
}
