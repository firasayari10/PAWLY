import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  validateEntryInput,
  validatePhotoCount,
  validatePhotoFile,
  canAddEntry,
  entryAuthzError,
  buildPhotoPath,
} from "@/lib/journal";
import { resolveAccount } from "@/lib/account";

const BUCKET = "journal-photos";

// POST /api/journal/:id/entries — add an entry (text + photos) to a journal.
// Accepts multipart/form-data: titre, contenu, offre_id?, photos[].
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: journalId } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide (form-data attendu)." }, { status: 400 });
  }

  const titre = String(form.get("titre") ?? "");
  const contenu = String(form.get("contenu") ?? "");
  const offreId = form.get("offre_id") ? String(form.get("offre_id")) : null;
  const photos = form.getAll("photos").filter((p): p is File => p instanceof File && p.size > 0);

  const inputError = validateEntryInput({ titre, contenu });
  if (inputError) return NextResponse.json({ error: inputError }, { status: 400 });

  const countError = validatePhotoCount(photos.length);
  if (countError) return NextResponse.json({ error: countError }, { status: 400 });

  for (const file of photos) {
    const fileError = validatePhotoFile({ type: file.type, size: file.size });
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  const { data: journal } = await supabase
    .from("journal")
    .select("id, proprietaire_id")
    .eq("id", journalId)
    .maybeSingle();
  if (!journal) return NextResponse.json({ error: "Journal introuvable." }, { status: 404 });

  // Authorize: owner, or a sitter with an accepted booking for this owner.
  const isOwner = journal.proprietaire_id === me.id_user;
  let isBookingSitter = false;
  if (!isOwner && offreId) {
    const { data: offre } = await supabase
      .from("offre_garde")
      .select("id")
      .eq("id", offreId)
      .eq("prestataire_id", me.id_user)
      .eq("proprietaire_id", journal.proprietaire_id)
      .eq("statut", "accepte")
      .maybeSingle();
    isBookingSitter = Boolean(offre);
  }

  const authzError = entryAuthzError({ isOwner, isBookingSitter });
  if (!canAddEntry({ isOwner, isBookingSitter })) {
    return NextResponse.json({ error: authzError }, { status: 403 });
  }

  // Insert the entry.
  const { data: entry, error: entryError } = await supabase
    .from("journal_entry")
    .insert({
      journal_id: journalId,
      auteur_id: me.id_user,
      offre_id: offreId,
      titre: titre.trim(),
      contenu: contenu.trim(),
    })
    .select("*")
    .single();
  if (entryError || !entry) {
    return NextResponse.json({ error: entryError?.message ?? "Création impossible." }, { status: 500 });
  }

  // Upload photos and record them.
  const savedPhotos: { id?: string; url: string }[] = [];
  for (let i = 0; i < photos.length; i++) {
    const file = photos[i];
    const path = buildPhotoPath(journalId, file.name, `${Date.now()}-${i}`);
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) {
      return NextResponse.json({ error: `Échec de l'upload : ${uploadError.message}` }, { status: 502 });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = pub?.publicUrl ?? "";

    const { data: photoRow } = await supabase
      .from("journal_photo")
      .insert({ entry_id: entry.id, url, chemin: path })
      .select("id, url")
      .single();
    savedPhotos.push(photoRow ?? { url });
  }

  // Bump the journal's updated_at so it surfaces in lists.
  await supabase
    .from("journal")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", journalId);

  return NextResponse.json({ entry: { ...entry, journal_photo: savedPhotos } }, { status: 201 });
}
