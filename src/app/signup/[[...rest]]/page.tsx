"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { AuthShell, AlreadySignedIn, useClerkAppearance } from "@/components/auth-shell";

export default function SignupCatchAllPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const appearance = useClerkAppearance();

  if (!isLoaded) return null;
  if (isSignedIn) return <AlreadySignedIn signOutRedirect="/signup" />;

  return (
    <AuthShell
      eyebrow="Inscription"
      title="Rejoignez la famille Pawly"
      subtitle="Créez votre compte en quelques secondes et trouvez le gardien idéal."
      switchPrompt="Vous avez déjà un compte ?"
      switchHref="/login"
      switchLabel="Se connecter"
    >
      <SignUp
        routing="hash"
        appearance={appearance}
        fallbackRedirectUrl="/landing"
        signInFallbackRedirectUrl="/landing"
      />
    </AuthShell>
  );
}
