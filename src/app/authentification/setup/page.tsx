"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SetupPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"proprietaire" | "prestataire" | null>(null);

  function handleContinue() {
    if (!selected) return;
    router.push(`/authentification/signup/register?role=${selected}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4 py-16 bg-[#FDFBF7] font-sans">

      {/* --- STYLES ANIMATIONS --- */}
      <style jsx>{`
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          animation: drift 15s ease-in-out infinite;
          z-index: 0;
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(40px, -30px) scale(1.1); }
          66%       { transform: translate(-30px, 20px) scale(0.95); }
        }
      `}</style>

      {/* Blobs d'arrière-plan */}
      <div className="blob w-[500px] h-[500px] bg-teal-500 -top-32 -left-24" />
      <div className="blob w-[400px] h-[400px] bg-orange-400 -bottom-20 -right-20 [animation-delay:-5s]" />
      <div className="blob w-[300px] h-[300px] bg-yellow-400 top-1/2 left-1/2 [animation-delay:-9s]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-12 no-underline text-3xl font-black text-teal-700 hover:scale-105 transition-transform" style={{ fontFamily: "'Fraunces', serif" }}>
          🐾 PAWLY
        </Link>

        {/* Header */}
        <div className="text-center mb-12 max-w-lg">
          <h1 className="text-4xl md:text-5xl font-black leading-tight text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>
            Bienvenue chez vous 🐾
          </h1>
          <p className="text-lg text-gray-600 mt-4 font-medium">
            Pour personnaliser votre expérience, dites-nous qui vous êtes.
          </p>
        </div>

        {/* Grid des Roles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mb-12">

          {/* Carte Propriétaire */}
          <div
            onClick={() => setSelected("proprietaire")}
            className={`group relative cursor-pointer rounded-[32px] p-10 border-2 transition-all duration-500 bg-white shadow-sm
              ${selected === "proprietaire"
                ? "border-teal-500 ring-4 ring-teal-50 shadow-2xl -translate-y-2"
                : "border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1"}`}
          >
            <div className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform duration-500 bg-teal-500 ${selected === "proprietaire" ? "scale-100" : "scale-0"}`}>
              ✓
            </div>
            <span className="text-6xl mb-6 block transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">🏠</span>
            <h2 className="text-2xl font-black mb-3 text-gray-800" style={{ fontFamily: "'Fraunces', serif" }}>Propriétaire</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">Je cherche un gardien de confiance pour mon compagnon.</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Chercher</span>
              <span className="px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Réserver</span>
            </div>
          </div>

          {/* Carte Prestataire */}
          <div
            onClick={() => setSelected("prestataire")}
            className={`group relative cursor-pointer rounded-[32px] p-10 border-2 transition-all duration-500 bg-white shadow-sm
              ${selected === "prestataire"
                ? "border-orange-500 ring-4 ring-orange-50 shadow-2xl -translate-y-2"
                : "border-transparent hover:border-orange-200 hover:shadow-xl hover:-translate-y-1"}`}
          >
            <div className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform duration-500 bg-orange-500 ${selected === "prestataire" ? "scale-100" : "scale-0"}`}>
              ✓
            </div>
            <span className="text-6xl mb-6 block transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">🦴</span>
            <h2 className="text-2xl font-black mb-3 text-gray-800" style={{ fontFamily: "'Fraunces', serif" }}>Pet-sitter</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">Je propose mes services de garde et de promenade.</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Travailler</span>
              <span className="px-3 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Gérer</span>
            </div>
          </div>
        </div>

        {/* Bouton Continuer */}
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`px-12 py-5 rounded-full text-lg font-bold transition-all duration-300 shadow-xl active:scale-95
            ${selected
              ? "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          {selected ? `Devenir ${selected === "proprietaire" ? "Propriétaire" : "Pet-sitter"} →` : "Choisissez votre rôle"}
        </button>

        <p className="mt-8 text-sm text-gray-400 font-medium">
          Déjà inscrit ?{" "}
          <Link href="/authentification/login" className="text-teal-600 font-bold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}