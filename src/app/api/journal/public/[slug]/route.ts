import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

const PUBLIC_JOURNAL = `
  titre, nom_animal, type_animal, is_public, public_slug, created_at,
  journal_entry (
    id, titre, contenu, created_at,
    journal_photo ( id, url )
  )
`;

// GET /api/journal/public/:slug — read-only public view (no auth).
// Returns 404 unless the journal exists AND is marked public.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: journal, error } = await supabase
    .from("journal")
    .select(PUBLIC_JOURNAL)
    .eq("public_slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!journal || journal.is_public !== true) {
    return NextResponse.json({ error: "Journal introuvable." }, { status: 404 });
  }

  if (journal.journal_entry) {
    (journal.journal_entry as { created_at?: string }[]).sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
  }

  return NextResponse.json({ journal });
}
