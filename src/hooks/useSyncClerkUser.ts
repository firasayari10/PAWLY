"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export function useSyncClerkUser() {
  const { user, isLoaded } = useUser();

  // Utilise un ref pour verrouiller la synchro en cours et éviter les appels multiples
  const isSyncing = useRef(false);
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      // 1. Garde-fous habituels
      if (!isLoaded || !user?.id) return;

      // 2. Éviter la synchro si elle est déjà faite ou en cours
      if (lastSyncedUserId.current === user.id || isSyncing.current) {
        return;
      }

      try {
        isSyncing.current = true;

        const syncData = {
          userId: user.id,
          email: user.emailAddresses?.[0]?.emailAddress ?? "",
          prenom: user.firstName ?? "",
          nom: user.lastName ?? "",
          telephone: user.phoneNumbers?.[0]?.phoneNumber ?? "",
          imageUrl: user.imageUrl ?? "", // Optionnel : pour garder l'avatar à jour dans DB
        };

        console.log(`[SYNC] 🔄 Synchronisation de ${syncData.email} vers Supabase...`);

        const res = await fetch("/api/profile/sync-utilisateur", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syncData),
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(payload?.error || "Erreur réseau");
        }

        if (!cancelled) {
          console.log("[SYNC] ✅ Utilisateur synchronisé avec succès.");
          lastSyncedUserId.current = user.id;
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("[SYNC] ❌ Échec de la synchronisation :", err.message);
          // On peut décider de ne pas mettre d'alert() ici pour ne pas bloquer l'UX,
          // mais plutôt de retenter au prochain changement d'état.
        }
      } finally {
        isSyncing.current = false;
      }
    }

    sync();

    return () => {
      cancelled = true;
    };
    // On garde les dépendances minimales pour éviter des triggers intempestifs
  }, [user?.id, isLoaded]);
}