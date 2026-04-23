"use client";

import Navbar from "@/components/navbar/Navbar";
import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [randomMessage, setRandomMessage] = useState("");

  useEffect(() => {
    const messages = [
      "🐾 Bienvenue dans la zone pet-friendly !",
      "🐶 Passez une super journée !",
      "🐱 Vos animaux sont entre de bonnes mains.",
      "🐰 Sautez vers le bonheur !",
      "🦜 Laissez votre esprit s'envoler !"
    ];
    setRandomMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, []);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#1C1C1C] font-sans">

      {/* Navbar commune */}
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[90vh] flex flex-col md:grid md:grid-cols-2 items-center gap-12 px-6 pt-32 max-w-7xl mx-auto">

        {/* Left Content */}
        <div className="z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full uppercase font-bold text-[10px] tracking-widest mb-6 bg-[#FDEEE9] text-[#F27E5F]">
            <span className="w-2 h-2 rounded-full bg-[#F27E5F] animate-pulse" />
            Plateforme de garde d&apos;animaux
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            La garde de votre animal, <br />
            <span className="text-[#2D9B8A] italic font-light">réinventée.</span>
          </h1>

          <p className="max-w-md mb-8 text-lg text-[#6B6B6B] leading-relaxed">
            Trouvez des gardiens vérifiés près de chez vous. Réservez en quelques clics et gardez l&apos;esprit tranquille.
          </p>

          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4">
            <Link href="/main/search" className="bg-[#2D9B8A] hover:bg-[#1E7A6B] text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-teal-900/10 transition-all hover:-translate-y-1 text-center">
              Trouver un gardien
            </Link>
            <Link href="/authentification/setup" className="bg-white border-2 border-[#E8DDD0] hover:border-[#2D9B8A] px-8 py-4 rounded-full font-bold transition-all hover:-translate-y-1 text-center">
              Devenir prestataire
            </Link>
          </div>
        </div>

        {/* Right Content - Visual Card */}
        <div className="relative flex justify-center items-center py-10">
          {/* Decorative Circle */}
          <div className="absolute w-80 h-80 md:w-[500px] md:h-[500px] bg-[#E8DDD0] rounded-full opacity-20 blur-3xl" />

          <div className="relative w-72 md:w-80 h-[480px]">
            {/* Floating Card Top */}
            <div className="absolute -top-4 -left-12 flex items-center gap-3 p-4 bg-white rounded-2xl shadow-xl z-20 animate-[float_4s_ease-in-out_infinite]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-teal-100">🐕</div>
              <div>
                <div className="font-bold text-xs text-gray-800">Réservation confirmée</div>
                <div className="text-[10px] text-gray-400 font-medium">Sophie · il y a 2 min</div>
              </div>
            </div>

            {/* Main Profile Card */}
            <div className="w-full h-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#E8DDD0] relative z-10">
              <div className="h-32 bg-gradient-to-br from-[#2D9B8A] to-[#7BC8D5] p-6 flex justify-end">
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full h-fit border border-white/30">✓ VÉRIFIÉ</span>
              </div>

              <div className="px-6 -mt-12">
                <div className="w-24 h-24 rounded-[2rem] border-4 border-white shadow-lg bg-gradient-to-tr from-[#F2A65A] to-[#E8795A] flex items-center justify-center text-3xl font-black text-white" style={{ fontFamily: "'Fraunces', serif" }}>
                  J
                </div>

                <div className="mt-4">
                  <h3 className="text-2xl font-black text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Julie M.</h3>
                  <p className="text-[#2D9B8A] font-bold text-xs uppercase tracking-wider mb-4">Pet Sitter Pro • Paris 11e</p>

                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {[{v:"247", l:"Gardes"}, {v:"4.9", l:"Note"}, {v:"98%", l:"Réponse"}].map(s => (
                      <div key={s.l} className="bg-[#F8F5F0] p-2 rounded-2xl text-center border border-[#E8DDD0]/50">
                        <span className="block font-black text-sm" style={{ fontFamily: "'Fraunces', serif" }}>{s.v}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mb-6">
                    {["🐶", "🐱", "🐰"].map(a => (
                      <span key={a} className="w-8 h-8 flex items-center justify-center bg-[#FDEEE9] rounded-xl text-sm">{a}</span>
                    ))}
                  </div>

                  <button className="w-full py-4 bg-[#2D9B8A] text-white rounded-2xl font-black shadow-lg shadow-teal-900/10 active:scale-95 transition-transform">
                    Voir le profil
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Card Bottom */}
            <div className="absolute -bottom-4 -right-8 flex items-center gap-3 p-4 bg-white rounded-2xl shadow-xl z-20 animate-[float_5s_ease-in-out_infinite_reverse]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-orange-100">🐱</div>
              <div>
                <div className="font-bold text-xs text-gray-800">E-journal à jour</div>
                <div className="text-[10px] text-gray-400 font-medium">Caramel va très bien !</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- STATS BAND --- */}
      <section className="bg-[#E8DDD0]/30 border-y border-[#E8DDD0] py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { num: "12 000+", label: "Prestataires vérifiés" },
            { num: "48 000+", label: "Propriétaires heureux" },
            { num: "4.9 / 5",  label: "Note moyenne" },
            { num: "150+ villes", label: "Partout en France" },
          ].map(s => (
            <div key={s.label} className="text-center group">
              <span className="block font-black text-3xl md:text-4xl text-[#1E7A6B] mb-2 group-hover:scale-110 transition-transform" style={{ fontFamily: "'Fraunces', serif" }}>{s.num}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B]">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white pt-20 pb-10 px-6 border-t border-[#E8DDD0]">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-black text-3xl text-[#1E7A6B] mb-6" style={{ fontFamily: "'Fraunces', serif" }}>PAWLY 🐾</p>
          <p className="text-[#6B6B6B] font-medium mb-8 max-w-sm mx-auto italic">{randomMessage}</p>

          <div className="flex justify-center gap-8 mb-12 text-sm font-bold text-gray-400">
            <Link href="#" className="hover:text-[#2D9B8A]">Contact</Link>
            <Link href="#" className="hover:text-[#2D9B8A]">Mentions légales</Link>
            <Link href="#" className="hover:text-[#2D9B8A]">Confidentialité</Link>
          </div>

          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} PAWLY Studio. Fait avec amour pour les animaux.
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}