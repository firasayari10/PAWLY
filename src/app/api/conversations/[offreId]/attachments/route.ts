import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";
import { resolveConversation } from "@/lib/conversations-server";
import {
  ATTACHMENT_BUCKET,
  buildAttachmentPath,
  isPathInConversation,
  validateAttachmentDeclaration,
} from "@/lib/chat-attachments";

// Encrypted chat attachments. The server never sees the file contents (they
// are AES-GCM ciphertext, encrypted in the browser with the conversation key);
// it only gates WHO may upload/download into a conversation's storage prefix.
// The declared mime/size below is therefore honest-client validation — the
// hard cap is the bucket's file_size_limit (see supabase/sprint7.sql).

const SIGNED_URL_TTL_SECONDS = 300;

// POST /api/conversations/:offreId/attachments — issue a signed upload URL.
// Body: { mime, size } (plaintext size; the stored object is size + GCM tag).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ offreId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offreId } = await params;

  let body: { mime?: unknown; size?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validationError = validateAttachmentDeclaration(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });

  const resolved = await resolveConversation(supabase, account.user, offreId);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const path = buildAttachmentPath(resolved.conversationId, crypto.randomUUID());
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Envoi indisponible." }, { status: 500 });
  }

  return NextResponse.json({ path, token: data.token }, { status: 201 });
}

// GET /api/conversations/:offreId/attachments?path=… — issue a short-lived
// signed download URL for an attachment of this conversation.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ offreId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offreId } = await params;
  const path = new URL(request.url).searchParams.get("path") ?? "";

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });

  const resolved = await resolveConversation(supabase, account.user, offreId);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  if (!isPathInConversation(path, resolved.conversationId)) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
