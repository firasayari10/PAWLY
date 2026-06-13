import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";
import { validatePublicKey } from "@/lib/conversations";

// POST /api/keys — register (or rotate) the caller's ECDH public key for E2EE chat.
// The private half never reaches the server; only this public key is stored.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { public_key?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validationError = validatePublicKey(body.public_key);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const { error } = await supabase
    .from("user_public_key")
    .upsert(
      { utilisateur_id: me.id_user, public_key: body.public_key as string, updated_at: new Date().toISOString() },
      { onConflict: "utilisateur_id" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
