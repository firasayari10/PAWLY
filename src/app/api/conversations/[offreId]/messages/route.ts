import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";
import { validateMessageInput } from "@/lib/conversations";
import { resolveConversation } from "@/lib/conversations-server";

// GET /api/conversations/:offreId/messages?after=<iso> — ciphertext history.
// Also serves as a polling fallback when Realtime isn't configured.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ offreId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offreId } = await params;
  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });

  const resolved = await resolveConversation(supabase, account.user, offreId);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const after = new URL(request.url).searchParams.get("after");

  let query = supabase
    .from("chat_message")
    .select("id, sender_id, ciphertext, iv, created_at")
    .eq("conversation_id", resolved.conversationId)
    .order("created_at", { ascending: true });

  if (after) query = query.gt("created_at", after);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: data ?? [] });
}

// POST /api/conversations/:offreId/messages — store one encrypted message.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ offreId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offreId } = await params;

  let body: { ciphertext?: unknown; iv?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validationError = validateMessageInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });

  const resolved = await resolveConversation(supabase, account.user, offreId);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const { data: message, error } = await supabase
    .from("chat_message")
    .insert({
      conversation_id: resolved.conversationId,
      sender_id: account.user.id_user,
      ciphertext: body.ciphertext as string,
      iv: body.iv as string,
    })
    .select("id, sender_id, ciphertext, iv, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message }, { status: 201 });
}
