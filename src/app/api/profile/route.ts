import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";

// ── Geocode a French city via Nominatim (free, no key) ───────────────────────
async function geocodeVille(
  ville: string,
  codePostal?: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = [codePostal, ville, "France"].filter(Boolean).join(", ");
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PAWLY/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    const data: Array<{ lat: string; lon: string }> = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    /* non-critical — silently skip */
  }
  return null;
}

// ── GET /api/profile ──────────────────────────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("utilisateur")
    .select(`
      id_user, prenom, nom, email, telephone, adresse, code_postal, ville,
      latitude, longitude, photo_profil, role, statut_compte,
      email_verifie, date_creation,
      prestataire_profil (
        id, bio, tarif_jour, types_animaux, rayon_km,
        annees_experience, note_moyenne, nb_avis, disponible
      )
    `)
    .eq("clerk_id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const profil = Array.isArray((data as any).prestataire_profil)
    ? (data as any).prestataire_profil[0] ?? null
    : (data as any).prestataire_profil ?? null;

  return NextResponse.json({ profile: { ...(data as any), prestataire_profil: profil } });
}

// ── PUT /api/profile ──────────────────────────────────────────────────────────
export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    prenom?: string;
    nom?: string;
    telephone?: string;
    adresse?: string;
    code_postal?: string;
    ville?: string;
    role?: string;
    // Prestataire-specific
    bio?: string;
    tarif_jour?: number;
    types_animaux?: string[];
    rayon_km?: number;
    annees_experience?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    prenom, nom, telephone, adresse, code_postal, ville, role,
    bio, tarif_jour, types_animaux, rayon_km, annees_experience,
  } = body;

  if (role !== undefined && !["proprietaire", "prestataire"].includes(role)) {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // ── Build utilisateur patch ──────────────────────────────────────────────
  const patch: Record<string, unknown> = {};
  if (prenom      !== undefined) patch.prenom      = prenom.trim();
  if (nom         !== undefined) patch.nom         = nom.trim();
  if (telephone   !== undefined) patch.telephone   = telephone.trim() || null; // NULL for empty
  if (adresse     !== undefined) patch.adresse     = adresse.trim();
  if (code_postal !== undefined) patch.code_postal = code_postal.trim();
  if (ville       !== undefined) patch.ville       = ville.trim();
  if (role        !== undefined) patch.role        = role;

  // ── Geocode when ville changes ───────────────────────────────────────────
  if (ville?.trim()) {
    const coords = await geocodeVille(ville.trim(), code_postal?.trim());
    if (coords) {
      patch.latitude  = coords.lat;
      patch.longitude = coords.lng;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("utilisateur")
    .update(patch)
    .eq("clerk_id", userId)
    .select(`
      id_user, prenom, nom, email, telephone, adresse, code_postal, ville,
      latitude, longitude, photo_profil, role, statut_compte,
      email_verifie, date_creation
    `)
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // ── Sync prestataire_profil ──────────────────────────────────────────────
  const effectiveRole = role ?? updated.role;

  if (effectiveRole === "prestataire") {
    const profPatch: Record<string, unknown> = {
      utilisateur_id:    updated.id_user,
      disponible:        true,
    };
    if (bio                !== undefined) profPatch.bio                = bio;
    if (tarif_jour         !== undefined) profPatch.tarif_jour         = tarif_jour;
    if (types_animaux      !== undefined) profPatch.types_animaux      = types_animaux;
    if (rayon_km           !== undefined) profPatch.rayon_km           = rayon_km;
    if (annees_experience  !== undefined) profPatch.annees_experience  = annees_experience;

    const { error: profError } = await supabase
      .from("prestataire_profil")
      .upsert(profPatch, { onConflict: "utilisateur_id" });

    if (profError) {
      console.error("[PROFILE PUT] prestataire_profil upsert error:", profError.message);
    }
  } else if (effectiveRole === "proprietaire") {
    // Mark as unavailable when switching back to proprietaire
    await supabase
      .from("prestataire_profil")
      .update({ disponible: false })
      .eq("utilisateur_id", updated.id_user);
  }

  // ── Return updated profile with profil joined ────────────────────────────
  const { data: full } = await supabase
    .from("utilisateur")
    .select(`
      id_user, prenom, nom, email, telephone, adresse, code_postal, ville,
      latitude, longitude, photo_profil, role, statut_compte,
      email_verifie, date_creation,
      prestataire_profil (
        id, bio, tarif_jour, types_animaux, rayon_km,
        annees_experience, note_moyenne, nb_avis, disponible
      )
    `)
    .eq("clerk_id", userId)
    .maybeSingle();

  const profil = Array.isArray((full as any)?.prestataire_profil)
    ? (full as any).prestataire_profil[0] ?? null
    : (full as any)?.prestataire_profil ?? null;

  return NextResponse.json({
    message: "Profil mis à jour.",
    profile: { ...(full as any), prestataire_profil: profil },
  });
}
