"use client";

import { useState, useEffect } from "react";
import { RedirectToSignIn, UserButton, useAuth } from "@clerk/nextjs";
import { useSyncClerkUser } from "../profile/sync-user";

export default function LandingPage() {
  useSyncClerkUser();
  const { isLoaded, isSignedIn } = useAuth();

  // Pick a random message once after component mounts
  const [randomMessage, setRandomMessage] = useState("");

  useEffect(() => {
    const messages = [
      "🐾 Welcome to the pet-friendly zone!",
      "🐶 Have a pawsome day!",
      "🐱 Cats rule, dogs drool!",
      "🐰 Hop into happiness!",
      "🦜 Let your spirits soar!"
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    //setRandomMessage(msg);
  }, []);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="min-h-screen flex flex-col bg-cream text-charcoal font-sans">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center bg-warm-white/95 backdrop-blur-md border-b border-sand-dark/30 p-5 md:px-20">
        <a href="#" className="font-serif font-black text-teal-dark text-xl flex items-center gap-2">
          <span>🐾</span> PAWLY
        </a>
        <div>
          <UserButton />
        </div>
      </nav>

      {/* HERO */}
      <section className="hero relative min-h-screen flex flex-col md:grid md:grid-cols-2 items-center gap-12 px-6 pt-28">
        {/* Hero left */}
        <div className="hero-left z-10 text-center md:text-left">
          <div className="hero-tag inline-flex items-center gap-2 bg-coral-light text-coral px-4 py-1 rounded-full uppercase font-medium text-xs mb-6">
            <span className="dot w-1.5 h-1.5 bg-coral rounded-full"></span> Plateforme de garde danimaux
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-serif mb-4">
            La garde de votre animal, <em className="text-teal font-light">réinventée</em>
          </h1>
          <p className="hero-desc text-mid-grey max-w-md mb-6">
            Trouvez des prestataires de garde vérifiés près de chez vous. Réservez en quelques clics, suivez la prestation en temps réel et gardez lesprit tranquille.
          </p>
          <div className="hero-actions flex justify-center md:justify-start gap-4">
            <button className="btn-primary bg-teal text-white rounded-full px-6 py-3 font-medium shadow-md hover:bg-teal-dark transition">Trouver un gardien</button>
            <button className="btn-secondary border border-sand-dark text-charcoal rounded-full px-6 py-3 hover:border-teal hover:text-teal transition">Devenir prestataire</button>
          </div>
        </div>

        {/* Hero right */}
        <div className="hero-right relative z-10 flex justify-center items-center">
          <div className="hero-bg-circle absolute w-96 h-96 bg-sand opacity-30 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0"></div>
          <div className="profile-card-stack relative w-80 h-[480px]">
            {/* Mini card 1 */}
            <div className="mini-card mini-card-1 absolute top-8 -left-8 flex items-center gap-2 p-3 bg-warm-white rounded-lg shadow-md animate-float1">
              <div className="mini-avatar w-9 h-9 bg-gradient-to-br from-[#A8D8EA] to-[#7BC8D5] flex items-center justify-center rounded-full">🐕</div>
              <div className="mini-card-info text-xs">
                <div className="mini-name font-semibold text-charcoal">Réservation confirmée</div>
                <div className="mini-sub text-mid-grey">Sophie · il y a 2 min</div>
              </div>
              <div className="badge-dot w-2 h-2 bg-green-500 rounded-full"></div>
            </div>

            {/* Main profile card */}
            <div className="clerk-profile absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 bg-warm-white rounded-2xl shadow-xl border border-sand-dark/40 overflow-hidden z-10">
              <div className="clerk-profile-header bg-gradient-to-br from-teal to-teal-light p-6 relative">
                <div className="clerk-verified-badge absolute top-2 right-2 bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1">✓ Vérifié</div>
                <div className="clerk-avatar-wrap w-18 h-18 rounded-full border-2 border-white flex items-center justify-center font-serif text-xl font-bold text-white">J</div>
              </div>
              <div className="clerk-profile-body p-6">
                <div className="clerk-name font-serif font-bold text-lg mb-1">Julie M.</div>
                <div className="clerk-role text-teal text-sm font-medium mb-3">Pet Sitter Professionnelle · Paris 11e</div>
                <div className="clerk-stats grid grid-cols-3 gap-2 mb-3">
                  <div className="clerk-stat text-center bg-light-grey p-2 rounded-lg">
                    <span className="clerk-stat-value font-serif font-bold text-base block">247</span>
                    <span className="clerk-stat-label text-xs text-mid-grey">Gardes</span>
                  </div>
                  <div className="clerk-stat text-center bg-light-grey p-2 rounded-lg">
                    <span className="clerk-stat-value font-serif font-bold text-base block">4.9</span>
                    <span className="clerk-stat-label text-xs text-mid-grey">Note</span>
                  </div>
                  <div className="clerk-stat text-center bg-light-grey p-2 rounded-lg">
                    <span className="clerk-stat-value font-serif font-bold text-base block">98%</span>
                    <span className="clerk-stat-label text-xs text-mid-grey">Réponse</span>
                  </div>
                </div>
                <div className="clerk-animals flex flex-wrap gap-2 mb-3">
                  <span className="clerk-animal-tag bg-coral-light text-coral text-xs px-2 py-0.5 rounded-full flex items-center gap-1">🐶 Chiens</span>
                  <span className="clerk-animal-tag bg-coral-light text-coral text-xs px-2 py-0.5 rounded-full flex items-center gap-1">🐱 Chats</span>
                  <span className="clerk-animal-tag bg-coral-light text-coral text-xs px-2 py-0.5 rounded-full flex items-center gap-1">🐰 Lapins</span>
                </div>
                <div className="clerk-rating flex items-center gap-2 mb-3">
                  <span className="stars text-yellow-400">★★★★★</span>
                  <span className="rating-val font-bold text-sm">4.99</span>
                  <span className="rating-count text-xs text-mid-grey">(183 avis)</span>
                </div>
                <button className="clerk-btn w-full bg-teal text-white rounded-lg py-2 font-medium hover:bg-teal-dark transition">Voir le profil complet</button>
              </div>
            </div>

            {/* Mini card 2 */}
            <div className="mini-card mini-card-2 absolute bottom-12 -right-5 flex items-center gap-2 p-3 bg-warm-white rounded-lg shadow-md animate-float2">
              <div className="mini-avatar w-9 h-9 bg-gradient-to-br from-[#F2A65A] to-[#E8795A] flex items-center justify-center rounded-full">🐱</div>
              <div className="mini-card-info text-xs">
                <div className="mini-name font-semibold text-charcoal">E-journal mis à jour</div>
                <div className="mini-sub text-mid-grey">Caramel est en pleine forme !</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <div className="stats-band flex justify-center gap-16 bg-sand py-8 border-y border-sand-dark">
        <div className="stat-item text-center">
          <span className="stat-num font-serif font-black text-2xl text-teal-dark block">12 000+</span>
          <span className="stat-label text-sm text-mid-grey">Prestataires vérifiés</span>
        </div>
        <div className="stat-item text-center">
          <span className="stat-num font-serif font-black text-2xl text-teal-dark block">48 000+</span>
          <span className="stat-label text-sm text-mid-grey">Propriétaires satisfaits</span>
        </div>
        <div className="stat-item text-center">
          <span className="stat-num font-serif font-black text-2xl text-teal-dark block">4.9 / 5</span>
          <span className="stat-label text-sm text-mid-grey">Note moyenne</span>
        </div>
        <div className="stat-item text-center">
          <span className="stat-num font-serif font-black text-2xl text-teal-dark block">150+ villes</span>
          <span className="stat-label text-sm text-mid-grey">En France</span>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-sand border-t border-sand-dark p-10 text-center">
        <p className="font-serif font-bold text-teal-dark text-lg mb-2">PAWLY</p>
        <p className="text-mid-grey mb-2">{randomMessage}</p>
        <p className="text-sm text-mid-grey">&copy; {new Date().getFullYear()} PAWLY. Tous droits réservés.</p>
      </footer>

      <style jsx>{`
        :root {
          --cream: #FBF7F0;
          --warm-white: #FFFDF9;
          --teal: #2D9B8A;
          --teal-dark: #1E7A6B;
          --coral: #F27E5F;
          --coral-light: #FDEEE9;
          --sand: #E8DDD0;
          --sand-dark: #C4B5A5;
          --charcoal: #1C1C1C;
          --mid-grey: #6B6B6B;
          --light-grey: #F0EDE8;
        }
        .animate-float1 { animation: float1 3.5s ease-in-out infinite; }
        .animate-float2 { animation: float2 4s ease-in-out infinite; }
        @keyframes float1 { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
        @keyframes float2 { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
      `}</style>
    </div>
  );
}