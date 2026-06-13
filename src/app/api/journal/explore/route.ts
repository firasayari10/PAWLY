import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { flattenPublicJournals, filterPosts } from "@/lib/journal";

const PUBLIC_FEED = `
  titre, nom_animal, type_animal, public_slug, is_public,
  proprietaire:proprietaire_id ( prenom ),
  journal_entry (
    id, titre, contenu, created_at,
    journal_photo ( id, url )
  )
`;

// GET /api/journal/explore — public feed of journals other users made public.
// Supports ?q=<journal title> and ?date=<YYYY-MM-DD>.
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const date = searchParams.get("date") ?? "";

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("journal")
    .select(PUBLIC_FEED)
    .eq("is_public", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const posts = filterPosts(flattenPublicJournals(data ?? []), { q, date });

  return NextResponse.json({ posts, count: posts.length });
}
