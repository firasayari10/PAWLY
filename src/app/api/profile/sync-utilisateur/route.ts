import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Utilisation du Service Role Key pour permettre la création initiale du profil sans restriction RLS
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, prenom, nom, telephone } = body;

    console.log("[SYNC-API] Synchronisation pour clerk_id:", userId);

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    // On prépare les données sécurisées (on garde tes valeurs par défaut)
    const userData = {
      clerk_id: userId,
      prenom: prenom || "",
      nom: nom || "",
      email: email || "",
      telephone: telephone || "",
      // Ces champs sont conservés s'ils existent déjà (grâce à l'upsert intelligent)
      // mais initialisés si c'est une nouvelle création
      password_hash: "",
      adresse: "",
      code_postal: "",
      ville: "",
      latitude: 0,
      longitude: 0,
      piece_identite_url: "",
      attestation_assurance_url: "",
      photo_profil: "",
      role: "proprietaire", // Rôle par défaut selon ton CDC
      statut_compte: "en_attente",
      date_creation: new Date().toISOString(),
      email_verifie: true,
      telephone_verifie: false,
    };

    /**
     * UPSERT :
     * - Si le 'clerk_id' n'existe pas : INSERT une nouvelle ligne.
     * - Si le 'clerk_id' existe déjà : UPDATE les infos (nom, prénom, email, tel).
     */
    const { data: inserted, error: syncError } = await supabase
      .from("utilisateur")
      .upsert(userData, {
        onConflict: 'clerk_id',
        ignoreDuplicates: false // On veut mettre à jour les infos si elles changent sur Clerk
      })
      .select("*")
      .single();

    if (syncError) {
      console.error("[SYNC-API] Erreur de synchronisation:", syncError);
      return NextResponse.json({ error: syncError.message }, { status: 500 });
    }

    console.log("[SYNC-API] Succès. Utilisateur ID Supabase:", inserted.id_user);

    return NextResponse.json({
      message: "Utilisateur synchronisé avec succès.",
      utilisateur: inserted
    }, { status: 200 });

  } catch (err: any) {
    console.error("[SYNC-API] Erreur inattendue:", err.message);
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}