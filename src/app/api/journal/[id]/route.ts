import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { validateEntryInput } from "@/lib/journal";
import { resolveAccount } from "@/lib/account";

const JOURNAL_WITH_ENTRIES = `
  id, proprietaire_id, titre, nom_animal, type_animal, is_public, public_slug, created_at, updated_at,
  journal_entry (
    id, titre, contenu, auteur_id, offre_id, created_at,
    journal_photo ( id, url, created_at )
  )
`;

type EntryRow = { created_at?: string };

function sortEntries(journal: { journal_entry?: EntryRow[] } | null) {
  if (journal?.journal_entry) {
    journal.journal_entry.sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
  }
  return journal;
}

// GET /api/journal/:id — full journal (owner or a sitter who contributed).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const { data: journal, error } = await supabase
    .from("journal")
    .select(JOURNAL_WITH_ENTRIES)
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!journal) return NextResponse.json({ error: "Journal introuvable." }, { status: 404 });

  const isOwner = journal.proprietaire_id === me.id_user;
  let isContributor = (journal.journal_entry ?? []).some(
    (e: { auteur_id?: string }) => e.auteur_id === me.id_user,
  );

  // A sitter currently caring for this owner's animal may also view the journal.
  if (!isOwner && !isContributor) {
    const { data: garde } = await supabase
      .from("offre_garde")
      .select("id")
      .eq("prestataire_id", me.id_user)
      .eq("proprietaire_id", journal.proprietaire_id)
      .eq("statut", "accepte")
      .maybeSingle();
    isContributor = Boolean(garde);
  }

  if (!isOwner && !isContributor) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  return NextResponse.json({ journal: sortEntries(journal), isOwner });
}

// PATCH /api/journal/:id — owner edits the title or toggles public visibility.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: { titre?: string; is_public?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.titre !== undefined) {
    const titleError = validateEntryInput({ titre: body.titre });
    if (titleError) return NextResponse.json({ error: titleError }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const { data: journal } = await supabase
    .from("journal")
    .select("id, proprietaire_id")
    .eq("id", id)
    .maybeSingle();
  if (!journal) return NextResponse.json({ error: "Journal introuvable." }, { status: 404 });
  if (journal.proprietaire_id !== me.id_user) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.titre !== undefined) patch.titre = body.titre.trim();
  if (body.is_public !== undefined) patch.is_public = Boolean(body.is_public);

  const { data: updated, error } = await supabase
    .from("journal")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ journal: updated });
}
