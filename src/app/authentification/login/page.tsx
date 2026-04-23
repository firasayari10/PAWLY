"use client";

import Link from "next/link";
import { SignIn, SignOutButton, useAuth } from "@clerk/nextjs";

export default function LoginCatchAllPage() {
  const { isLoaded, isSignedIn } = useAuth();

  // État de chargement élégant
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="animate-pulse text-teal-600 font-bold text-xl">PAWLY...</div>
      </div>
    );
  }

  // Cas où l'utilisateur est déjà connecté
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-[#E8DDD0] max-w-sm">
          <span className="text-4xl mb-4 block">👋</span>
          <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
            Bonjour !
          </h1>
          <p className="text-gray-500 mb-6">Vous êtes déjà connecté à votre compte Pawly.</p>

          <div className="flex flex-col gap-3">
            <Link
              href="/main/dashboard"
              className="bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-2xl font-bold transition shadow-lg shadow-teal-600/20"
            >
              Aller au tableau de bord
            </Link>

            <div className="text-sm font-semibold text-gray-400 mt-2">
              <SignOutButton redirectUrl="/login">
                <button className="hover:text-red-500 transition">Se déconnecter</button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Page de connexion PAWLY
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col lg:flex-row">
      {/* Côté Gauche : Visuel & Pitch (Optionnel mais recommandé pour le look) */}
      <div className="hidden lg:flex lg:w-1/2 bg-teal-600 items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute top-10 left-10 text-2xl font-black">PAWLY 🐾</div>
        <div className="z-10 max-w-md">
          <h2 className="text-5xl font-black mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
            Les meilleures pattes pour vos boules de poils.
          </h2>
          <p className="text-teal-100 text-lg">
            Rejoignez la communauté de pet-sitting la plus fiable et attentionnée.
          </p>
        </div>
        {/* Décoration subtile */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-teal-500 rounded-full opacity-50"></div>
      </div>

      {/* Côté Droit : Le formulaire Clerk */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-8">
                <h1 className="text-3xl font-black text-teal-600">PAWLY 🐾</h1>
            </div>

            <SignIn
                routing="hash"
                afterSignInUrl="/main/dashboard"
                afterSignUpUrl="/main/dashboard"
                appearance={{
                    elements: {
                        formButtonPrimary: "bg-teal-600 hover:bg-teal-700 text-sm normal-case rounded-xl",
                        card: "shadow-none border-none bg-transparent",
                        headerTitle: "font-black text-2xl text-gray-800",
                        headerSubtitle: "text-gray-500",
                        footerActionLink: "text-teal-600 hover:text-teal-700 font-bold"
                    }
                }}
            />
        </div>
      </div>
    </div>
  );
}