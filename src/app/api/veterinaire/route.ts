import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";

// GET /api/veterinaire — the current owner's vet record (or null).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const { data: veterinaire, error } = await supabase
    .from("info_veterinaire")
    .select("*")
    .eq("proprietaire_id", me.id_user)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ veterinaire: veterinaire ?? null });
}

// PUT /api/veterinaire — upsert the current owner's vet record.
export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    nom_veterinaire?: string;
    nom_clinique?: string;
    telephone?: string;
    email?: string;
    adresse?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const record = {
    proprietaire_id: me.id_user,
    nom_veterinaire: body.nom_veterinaire ?? "",
    nom_clinique: body.nom_clinique ?? "",
    telephone: body.telephone ?? "",
    email: body.email ?? "",
    adresse: body.adresse ?? "",
    notes: body.notes ?? "",
    updated_at: new Date().toISOString(),
  };

  const { data: veterinaire, error } = await supabase
    .from("info_veterinaire")
    .upsert(record, { onConflict: "proprietaire_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ veterinaire });
}
