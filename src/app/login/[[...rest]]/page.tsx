"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { AuthShell, AlreadySignedIn, useClerkAppearance } from "@/components/auth-shell";

export default function LoginCatchAllPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const appearance = useClerkAppearance();

  if (!isLoaded) return null;
  if (isSignedIn) return <AlreadySignedIn signOutRedirect="/login" />;

  return (
    <AuthShell
      eyebrow="Connexion"
      title="Bon retour parmi nous"
      subtitle="Connectez-vous pour retrouver vos gardiens et vos réservations."
      switchPrompt="Pas encore de compte ?"
      switchHref="/signup"
      switchLabel="Créer un compte"
    >
      <SignIn
        routing="hash"
        appearance={appearance}
        fallbackRedirectUrl="/landing"
        signUpFallbackRedirectUrl="/landing"
      />
    </AuthShell>
  );
}
