"use client";

import { RedirectToSignIn, SignOutButton, useAuth } from "@clerk/nextjs";
import { useSyncClerkUser } from "./sync-user";

export default function ProfilePage() {
  useSyncClerkUser();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <SignOutButton redirectUrl="/login">
        Sign out
      </SignOutButton>
    </div>
  );
}
