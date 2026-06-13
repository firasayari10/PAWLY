import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { validateSignalementInput } from "@/lib/admin";
import { resolveAccount } from "@/lib/account";

// POST /api/signalements — any authenticated user reports a profile, review or booking.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { type?: string; cible_id?: string; motif?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validationError = validateSignalementInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const { data: signalement, error } = await supabase
    .from("signalement")
    .insert({
      type: body.type,
      cible_id: body.cible_id!.trim(),
      signale_par: me.id_user,
      motif: body.motif!.trim(),
      statut: "ouvert",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signalement }, { status: 201 });
}
