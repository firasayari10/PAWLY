"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setLoading(true);
    setError("");

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/authentification/setup");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? "Code invalide. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FDFBF7] p-6 overflow-hidden font-sans">

      {/* Blobs de rappel pour la cohérence visuelle */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-teal-500/10 blur-[80px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-orange-500/10 blur-[80px] rounded-full animate-pulse [animation-delay:2s]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
            <Link href="/" className="inline-block text-2xl font-black text-teal-700 no-underline mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                🐾 PAWLY
            </Link>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-teal-900/5 p-10 border border-[#E8DDD0] text-center">
          <div className="bg-teal-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
            <span className="text-4xl animate-bounce">📩</span>
          </div>

          <h1 className="text-3xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
            Presque fini !
          </h1>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Saisissez le code de vérification envoyé sur votre boîte mail pour activer votre compte.
          </p>

          <form onSubmit={handleVerify} className="space-y-8">
            <div className="relative group">
              <input
                type="text"
                placeholder="000000"
                className={`w-full p-6 text-center text-3xl tracking-[0.5em] font-black bg-gray-50 border-2 rounded-3xl outline-none transition-all
                  ${error ? "border-red-100 text-red-500" : "border-gray-100 focus:border-teal-500 focus:bg-white focus:ring-8 focus:ring-teal-500/5"}
                `}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
              {/* Petit indicateur visuel sous l'input */}
              <div className="mt-2 flex justify-center gap-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`h-1 w-4 rounded-full transition-colors ${code.length > i ? "bg-teal-500" : "bg-gray-200"}`} />
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold animate-shake">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className={`w-full py-5 rounded-full text-white font-black text-lg transition-all shadow-xl active:scale-95
                ${loading || code.length < 6
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-teal-600 hover:bg-teal-700 shadow-teal-600/30"}
              `}
            >
              {loading ? "Vérification..." : "Activer mon compte →"}
            </button>
          </form>

          <div className="mt-10">
            <p className="text-sm text-gray-400 font-medium">
              Vous n'avez rien reçu ? <br />
              <button className="text-teal-600 font-bold hover:underline mt-1">Renvoyer le code</button>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}