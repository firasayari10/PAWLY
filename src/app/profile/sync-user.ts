"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export function useSyncClerkUser() {
  const { user, isLoaded } = useUser();
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (!isLoaded) return;
      if (!user?.id) return;
      if (lastSyncedUserId.current === user.id) return;

      try {
        const email = user.emailAddresses?.[0]?.emailAddress ?? "";
        const prenom = user.firstName ?? "";
        const nom = user.lastName ?? "";
        const telephone = user.phoneNumbers?.[0]?.phoneNumber ?? "";

        const res = await fetch("/api/profile/sync-utilisateur", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, email, prenom, nom, telephone }),
        });

        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("[SYNC] Supabase sync failed:", res.status, payload?.error ?? payload);
          return;
        }

        lastSyncedUserId.current = user.id;
      } catch (err) {
        if (!cancelled) {
          console.error("[SYNC] Supabase sync error:", err);
        }
      }
    }

    sync();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.emailAddresses, user?.firstName, user?.lastName, user?.phoneNumbers, isLoaded]);
}
