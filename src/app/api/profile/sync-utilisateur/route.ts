import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.log("[SYNC-API] Raw request body:", body);
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      console.error("[SYNC-API] Failed to parse JSON:", e);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { userId, email, prenom, nom, telephone } = parsed;
    console.log("[SYNC-API] Parsed:", { userId, email, prenom, nom, telephone });
    if (!userId) {
      console.error("[SYNC-API] Missing userId");
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const safeEmail = typeof email === "string" ? email : "";
    const safePrenom = typeof prenom === "string" ? prenom : "";
    const safeNom = typeof nom === "string" ? nom : "";
    const safeTelephone = typeof telephone === "string" ? telephone : "";
    console.log("[SYNC-API] Using Supabase URL:", process.env.SUPABASE_URL);
    console.log("[SYNC-API] Using Service Role Key present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // Check if utilisateur already exists by clerk_id
    const { data: existing, error: existingError } = await supabase
      .from("utilisateur")
      .select("clerk_id")
      .eq("clerk_id", userId)
      .maybeSingle();
    if (existingError) {
      console.error("[SYNC-API] Error checking existing utilisateur:", existingError);
      const e = existingError as { message: string; details?: string; hint?: string; code?: string };
      return NextResponse.json(
        { error: e.message, details: e.details, hint: e.hint, code: e.code },
        { status: 500 },
      );
    }
    if (existing) {
      console.log("[SYNC-API] Utilisateur already exists:", existing);
      return NextResponse.json({ message: "Utilisateur already exists." }, { status: 200 });
    }
    const id_user = randomUUID();
    const { data: inserted, error: insertError } = await supabase
      .from("utilisateur")
      .insert({
        id_user,
        clerk_id: userId,
        prenom: safePrenom,
        nom: safeNom,
        email: safeEmail,
        password_hash: "",
        telephone: safeTelephone,
        adresse: "",
        code_postal: "",
        ville: "",
        latitude: 0,
        longitude: 0,
        piece_identite_url: "",
        attestation_assurance_url: "",
        photo_profil: "",
        role: "proprietaire",
        statut_compte: "en_attente",
        date_creation: new Date().toISOString(),
        email_verifie: true,
        telephone_verifie: false,
      })
      .select("*")
      .single();
    if (insertError) {
      console.error("[SYNC-API] Error inserting utilisateur:", insertError);
      const e = insertError as { message: string; details?: string; hint?: string; code?: string };
      return NextResponse.json(
        { error: e.message, details: e.details, hint: e.hint, code: e.code },
        { status: 500 },
      );
    }
    console.log("[SYNC-API] Utilisateur inserted:", inserted);
    return NextResponse.json({ message: "Utilisateur synced.", utilisateur: inserted }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SYNC-API] Unexpected error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
