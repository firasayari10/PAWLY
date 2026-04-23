import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.log("[SETUP-API] Raw request body:", body);

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      console.error("[SETUP-API] Failed to parse JSON:", e);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      userId,
      role,
      statut,
      telephone,
      adresse,
      code_postal,
      ville,
      bio,
      animaux_acceptes,
      services,
    } = parsed;

    console.log("[SETUP-API] Parsed:", { userId, role, statut, telephone, adresse, code_postal, ville });

    // ── Validation ────────────────────────────────────────────────────────────

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }
    if (!role || !["proprietaire", "prestataire"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (!statut || !["particulier", "professionnel"].includes(statut)) {
      return NextResponse.json({ error: "Invalid statut." }, { status: 400 });
    }
    if (!telephone || !adresse || !code_postal || !ville) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // ── Supabase ──────────────────────────────────────────────────────────────

    console.log("[SETUP-API] Using Supabase URL:", process.env.SUPABASE_URL);
    console.log("[SETUP-API] Service Role Key present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Vérifier que l'utilisateur existe bien
    const { data: existing, error: fetchError } = await supabase
      .from("utilisateur")
      .select("clerk_id, statut_compte")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("[SETUP-API] Error fetching utilisateur:", fetchError);
      return NextResponse.json(
        { error: fetchError.message, details: fetchError.details },
        { status: 500 }
      );
    }

    if (!existing) {
      console.error("[SETUP-API] Utilisateur not found for clerk_id:", userId);
      return NextResponse.json(
        { error: "Utilisateur not found. Please complete sync first." },
        { status: 404 }
      );
    }

    // Construire le payload de mise à jour
    const updatePayload: Record<string, unknown> = {
      role,
      statut_utilisateur: statut,
      telephone,
      adresse,
      code_postal,
      ville,
      statut_compte: "actif", // Le profil est maintenant complet
    };

    // Champs spécifiques aux prestataires
    if (role === "prestataire") {
      updatePayload.bio = typeof bio === "string" ? bio : "";
      updatePayload.animaux_acceptes = Array.isArray(animaux_acceptes) ? animaux_acceptes : [];
      updatePayload.services_proposes = Array.isArray(services) ? services : [];
    }

    console.log("[SETUP-API] Updating utilisateur with payload:", updatePayload);

    const { data: updated, error: updateError } = await supabase
      .from("utilisateur")
      .update(updatePayload)
      .eq("clerk_id", userId)
      .select("*")
      .single();

    if (updateError) {
      console.error("[SETUP-API] Error updating utilisateur:", updateError);
      return NextResponse.json(
        {
          error: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        },
        { status: 500 }
      );
    }

    console.log("[SETUP-API] Utilisateur updated successfully:", updated);
    return NextResponse.json(
      { message: "Profile setup complete.", utilisateur: updated },
      { status: 200 }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SETUP-API] Unexpected error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}