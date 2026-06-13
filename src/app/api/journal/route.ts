import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { validateJournalInput, slugify } from "@/lib/journal";
import { resolveAccount } from "@/lib/account";

// GET /api/journal — journals I own + journals I've contributed to (as a sitter).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const { data: owned, error } = await supabase
    .from("journal")
    .select("id, titre, nom_animal, type_animal, is_public, public_slug, created_at, updated_at")
    .eq("proprietaire_id", me.id_user)
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Journals I've written in but don't own.
  const { data: myEntries } = await supabase
    .from("journal_entry")
    .select("journal_id")
    .eq("auteur_id", me.id_user);

  const ownedIds = new Set((owned ?? []).map((j) => j.id));
  const contributedIds = [
    ...new Set((myEntries ?? []).map((e) => e.journal_id).filter((id) => !ownedIds.has(id))),
  ];

  let contributed: unknown[] = [];
  if (contributedIds.length > 0) {
    const { data } = await supabase
      .from("journal")
      .select("id, titre, nom_animal, type_animal, is_public, public_slug, created_at, updated_at")
      .in("id", contributedIds);
    contributed = data ?? [];
  }

  return NextResponse.json({
    owned: owned ?? [],
    contributed,
  });
}

// POST /api/journal — create a journal (carnet) for one of my animals.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { titre?: string; nom_animal?: string; type_animal?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validationError = validateJournalInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const suffix = randomSuffix();
  const record = {
    proprietaire_id: me.id_user,
    titre: body.titre!.trim(),
    nom_animal: body.nom_animal!.trim(),
    type_animal: (body.type_animal ?? "").trim(),
    is_public: false,
    public_slug: slugify(body.titre!, suffix),
  };

  const { data: journal, error } = await supabase
    .from("journal")
    .insert(record)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ journal }, { status: 201 });
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
