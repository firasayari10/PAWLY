import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { isAdmin, removeFromAverage } from "@/lib/admin";
import { resolveAccount } from "@/lib/account";

// DELETE /api/admin/reviews/:id — remove an abusive review and roll back the
// sitter's running average (admin only).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  if (!isAdmin(account.user.role)) return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });

  const { data: avis } = await supabase
    .from("avis_offre")
    .select("id, note, prestataire_id")
    .eq("id", id)
    .maybeSingle();
  if (!avis) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });

  // Roll the rating back out of the sitter's average.
  const { data: profil } = await supabase
    .from("prestataire_profil")
    .select("note_moyenne, nb_avis")
    .eq("utilisateur_id", avis.prestataire_id)
    .maybeSingle();
  if (profil) {
    const next = removeFromAverage(Number(profil.note_moyenne), Number(profil.nb_avis), Number(avis.note));
    await supabase
      .from("prestataire_profil")
      .update({ note_moyenne: next.note_moyenne, nb_avis: next.nb_avis })
      .eq("utilisateur_id", avis.prestataire_id);
  }

  const { error } = await supabase.from("avis_offre").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: "Avis supprimé." });
}
