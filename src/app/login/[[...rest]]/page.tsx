"use client";

import Link from "next/link";
import { SignIn, SignOutButton, useAuth } from "@clerk/nextjs";

export default function LoginCatchAllPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <div className="text-lg font-semibold">You are already signed in.</div>
        <div className="flex flex-col gap-2">
          <Link className="underline" href="/landing">
            Go to landing
          </Link>
          <SignOutButton redirectUrl="/login">Log out</SignOutButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn routing="hash" afterSignInUrl="/landing" afterSignUpUrl="/landing" />
    </div>
  );
}

