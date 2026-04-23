"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function SignupRoleSelectPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"proprietaire" | "prestataire" | null>(null);

  function handleContinue() {
    if (!selected) return;
    router.push(`/authentification/signup/register?role=${selected}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4 py-16 bg-[#FDFBF7] font-sans">

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=DM+Sans:wght@400;500;700&display=swap');

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          animation: drift 15s ease-in-out infinite;
          z-index: 0;
        }
        .blob-1 { width: 500px; height: 500px; background: #2D9B8A; top: -100px; left: -100px; }
        .blob-2 { width: 400px; height: 400px; background: #F27E5F; bottom: -80px; right: -80px; animation-delay: -5s; }
        .blob-3 { width: 300px; height: 300px; background: #E8C547; top: 40%; left: 55%; animation-delay: -9s; }

        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(40px, -30px) scale(1.08); }
          66%       { transform: translate(-30px, 20px) scale(0.95); }
        }

        .fade-up { opacity: 0; transform: translateY(20px); animation: fadeUp 0.6s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Background blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">

        {/* Logo */}
        <Link href="/" className="fade-up flex items-center gap-2 mb-10 no-underline text-3xl font-black text-teal-700 hover:scale-105 transition-transform" style={{ fontFamily: "'Fraunces', serif" }}>
          🐾 PAWLY
        </Link>

        {/* Heading */}
        <div className="fade-up [animation-delay:100ms] text-center mb-12 max-w-[550px]">
          <h1 className="text-4xl md:text-5xl font-black leading-tight text-gray-900 mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
            Bienvenue sur PAWLY 🐾
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            Pour personnaliser votre expérience, dites-nous qui vous êtes.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="fade-up [animation-delay:300ms] grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mb-12">

          {/* Propriétaire */}
          <div
            onClick={() => setSelected("proprietaire")}
            className={`group relative cursor-pointer rounded-[32px] p-8 border-2 transition-all duration-500 bg-white shadow-sm overflow-hidden
              ${selected === "proprietaire"
                ? "border-teal-500 ring-4 ring-teal-50 shadow-2xl -translate-y-2"
                : "border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1"}`}
          >
             {/* Checkmark Badge */}
            <div className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-white transition-all duration-500 bg-teal-500 ${selected === "proprietaire" ? "scale-100 rotate-0" : "scale-0 rotate-12"}`}>
              ✓
            </div>

            <span className="text-6xl mb-6 block transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">🏠</span>
            <h2 className="text-2xl font-black mb-2 text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Propriétaire</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">Je cherche quelqu'un de confiance pour garder mon animal.</p>

            <div className="flex flex-wrap gap-2">
              {["🔍 Trouver", "📅 Réserver", "⭐ Avis"].map(f => (
                <span key={f} className="px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded-full">{f}</span>
              ))}
            </div>
          </div>

          {/* Pet-sitter */}
          <div
            onClick={() => setSelected("prestataire")}
            className={`group relative cursor-pointer rounded-[32px] p-8 border-2 transition-all duration-500 bg-white shadow-sm overflow-hidden
              ${selected === "prestataire"
                ? "border-orange-500 ring-4 ring-orange-50 shadow-2xl -translate-y-2"
                : "border-transparent hover:border-orange-200 hover:shadow-xl hover:-translate-y-1"}`}
          >
            <div className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-white transition-all duration-500 bg-orange-500 ${selected === "prestataire" ? "scale-100 rotate-0" : "scale-0 rotate-12"}`}>
              ✓
            </div>

            <span className="text-6xl mb-6 block transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">🦴</span>
            <h2 className="text-2xl font-black mb-2 text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Pet-sitter</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">Je propose des services de garde et de promenade.</p>

            <div className="flex flex-wrap gap-2">
              {["📆 Dispos", "💰 Tarifs", "🏆 Revenus"].map(f => (
                <span key={f} className="px-3 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-full">{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="fade-up [animation-delay:500ms] flex flex-col items-center gap-6">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className={`px-16 py-5 rounded-full text-lg font-bold transition-all duration-300 shadow-xl active:scale-95
              ${selected
                ? "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/30"
                : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"}`}
          >
            {selected
              ? `Devenir ${selected === "proprietaire" ? "Propriétaire" : "Pet-sitter"} →`
              : "Choisissez votre rôle pour continuer"}
          </button>

          <p className="text-sm text-gray-400 font-medium">
            Déjà un compte ?{" "}
            <Link href="/authentification/login" className="text-teal-600 font-bold hover:underline transition-all">Se connecter</Link>
          </p>
        </div>

      </div>
    </div>
  );
}