import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const { userId: authenticatedUserId } = await auth();
    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let parsed: { userId?: string; email?: string; prenom?: string; nom?: string; telephone?: string };
    try {
      parsed = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { userId, email, prenom, nom, telephone } = parsed;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }
    if (userId !== authenticatedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const safeEmail     = typeof email     === "string" ? email.trim()     : "";
    const safePrenom    = typeof prenom    === "string" ? prenom.trim()    : "";
    const safeNom       = typeof nom       === "string" ? nom.trim()       : "";
    const safeTelephone = typeof telephone === "string" ? telephone.trim() : "";

    const supabase = createServerSupabase();

    const { data: existing, error: existingError } = await supabase
      .from("utilisateur")
      .select("clerk_id, prenom, nom, telephone")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (existingError) {
      const e = existingError as { message: string; details?: string; hint?: string; code?: string };
      return NextResponse.json(
        { error: e.message, details: e.details, hint: e.hint, code: e.code },
        { status: 500 },
      );
    }

    // ── UPDATE path: sync Clerk data changes back to Supabase ──────────────────
    if (existing) {
      const needsUpdate =
        (safePrenom    && existing.prenom    !== safePrenom)    ||
        (safeNom       && existing.nom       !== safeNom)       ||
        (safeTelephone && existing.telephone !== safeTelephone);

      if (!needsUpdate) {
        return NextResponse.json({ message: "Utilisateur already up to date." }, { status: 200 });
      }

      const patch: Record<string, string | null> = {};
      if (safePrenom    && existing.prenom    !== safePrenom)    patch.prenom    = safePrenom;
      if (safeNom       && existing.nom       !== safeNom)       patch.nom       = safeNom;
      if (safeTelephone && existing.telephone !== safeTelephone) patch.telephone = safeTelephone || null;

      const { error: updateError } = await supabase
        .from("utilisateur")
        .update(patch)
        .eq("clerk_id", userId);

      if (updateError) {
        const e = updateError as { message: string; details?: string; hint?: string; code?: string };
        return NextResponse.json(
          { error: e.message, details: e.details, hint: e.hint, code: e.code },
          { status: 500 },
        );
      }

      return NextResponse.json({ message: "Utilisateur updated." }, { status: 200 });
    }

    // ── CREATE path: first login ───────────────────────────────────────────────
    const id_user = randomUUID();
    const { data: inserted, error: insertError } = await supabase
      .from("utilisateur")
      .insert({
        id_user,
        clerk_id:              userId,
        prenom:                safePrenom,
        nom:                   safeNom,
        email:                 safeEmail,
        password_hash:         "",
        telephone:             safeTelephone || null,
        adresse:               "",
        code_postal:           "",
        ville:                 "",
        latitude:              0,
        longitude:             0,
        piece_identite_url:    "",
        attestation_assurance_url: "",
        photo_profil:          "",
        role:                  "proprietaire",
        statut_compte:         "en_attente",
        date_creation:         new Date().toISOString(),
        email_verifie:         true,
        telephone_verifie:     false,
      })
      .select("*")
      .single();

    if (insertError) {
      const e = insertError as { message: string; details?: string; hint?: string; code?: string };
      return NextResponse.json(
        { error: e.message, details: e.details, hint: e.hint, code: e.code },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Utilisateur synced.", utilisateur: inserted },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SYNC-API] Unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
