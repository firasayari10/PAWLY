"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";

// ─── NavBar ─────────────────────────────────────────────────────────────────

function NavBar() {
  const { isSignedIn } = useUser();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-zinc-200/60 bg-amber-50/80 px-8 py-4 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/80 lg:px-16">
      <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-black tracking-tight text-teal-700 dark:text-teal-400">
        <span>🐾</span>
        <span>PAWLY</span>
      </Link>

      <ul className="hidden items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400 lg:flex">
        <li><Link href="#how"      className="transition hover:text-teal-600 dark:hover:text-teal-400">Comment ça marche</Link></li>
        <li><Link href="#features" className="transition hover:text-teal-600 dark:hover:text-teal-400">Fonctionnalités</Link></li>
        <li><Link href="#users"    className="transition hover:text-teal-600 dark:hover:text-teal-400">Utilisateurs</Link></li>
        <li><Link href="#reviews"  className="transition hover:text-teal-600 dark:hover:text-teal-400">Avis</Link></li>
      </ul>

      {isSignedIn ? (
        <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "h-8 w-8" } }} />
      ) : (
        // ✅ FIX: was "/signup" → corrected to match actual route structure
        <Link
          href="/authentification/login"
          className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
        >
          Commencer gratuitement
        </Link>
      )}
    </nav>
  );
}

// ─── Profile Card ────────────────────────────────────────────────────────────

function ClerkProfileCard() {
  return (
    <div className="relative flex h-[500px] w-[360px] items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-80 w-80 rounded-full bg-amber-100 opacity-60 dark:bg-teal-900/30" />
      </div>

      <div className="absolute left-0 top-10 z-10 flex animate-[float_3.5s_ease-in-out_0.5s_infinite] items-center gap-2.5 rounded-2xl border border-zinc-200/50 bg-white px-4 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-teal-400 text-lg">🐕</div>
        <div>
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Réservation confirmée</p>
          <p className="text-[11px] text-zinc-400">Sophie · il y a 2 min</p>
        </div>
        <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-green-400" />
      </div>

      <div className="relative z-20 w-72 overflow-hidden rounded-3xl border border-zinc-200/40 bg-white shadow-2xl dark:border-zinc-700/40 dark:bg-zinc-900">
        <div className="relative bg-gradient-to-br from-teal-600 to-teal-400 p-6">
          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            ✓ Vérifié
          </span>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white/60 bg-gradient-to-br from-orange-300 to-rose-400 font-serif text-3xl font-bold text-white">
            J
          </div>
        </div>
        <div className="p-5">
          <p className="font-serif text-xl font-bold text-zinc-800 dark:text-zinc-100">Julie M.</p>
          <p className="mb-4 text-xs font-medium text-teal-600 dark:text-teal-400">Pet Sitter Professionnelle · Paris 11e</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[{ value: "247", label: "Gardes" }, { value: "4.9", label: "Note" }, { value: "98%", label: "Réponse" }].map((s) => (
              <div key={s.label} className="rounded-xl bg-zinc-50 p-2.5 text-center dark:bg-zinc-800">
                <span className="block font-serif text-base font-bold text-zinc-800 dark:text-zinc-100">{s.value}</span>
                <span className="text-[10px] text-zinc-400">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {["🐶 Chiens", "🐱 Chats", "🐰 Lapins"].map((tag) => (
              <span key={tag} className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-500 dark:bg-orange-900/20 dark:text-orange-400">{tag}</span>
            ))}
          </div>
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="tracking-tight text-amber-400">★★★★★</span>
            <span className="font-bold text-zinc-800 dark:text-zinc-100">4.99</span>
            <span className="text-zinc-400">(183 avis)</span>
          </div>
          <button className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600">
            Voir le profil complet
          </button>
        </div>
      </div>

      <div className="absolute bottom-10 right-0 z-10 flex animate-[float_4.2s_ease-in-out_1s_infinite] items-center gap-2.5 rounded-2xl border border-zinc-200/50 bg-white px-4 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-rose-400 text-lg">🐱</div>
        <div>
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">E-journal mis à jour</p>
          <p className="text-[11px] text-zinc-400">Caramel est en pleine forme !</p>
        </div>
      </div>
    </div>
  );
}

// ─── Hero CTAs ───────────────────────────────────────────────────────────────

function HeroCTAs() {
  const { isSignedIn } = useUser();

  return (
    <div className="mt-10 flex flex-wrap gap-4">
      {isSignedIn ? (
        <Link
          href="/main/landing"
          className="rounded-full bg-teal-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:-translate-y-0.5 hover:bg-teal-700"
        >
          Mon espace →
        </Link>
      ) : (
        <>
          {/* ✅ FIX: was "/signup" → now points to actual signup route */}
          <Link
            href="/authentification/signup/register"
            className="rounded-full bg-teal-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-teal-300 dark:shadow-teal-900"
          >
            Trouver un gardien
          </Link>
          {/* ✅ FIX: was "/signup?role=sitter" → now points to actual signup route */}
          <Link
            href="/authentification/signup/register?role=sitter"
            className="rounded-full border border-zinc-300 px-8 py-4 text-sm font-semibold text-zinc-700 transition hover:border-teal-500 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-teal-500 dark:hover:text-teal-400"
          >
            Devenir prestataire
          </Link>
        </>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-amber-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,700;0,900;1,300&family=DM+Sans:wght@300;400;500&display=swap');
        .font-serif { font-family: 'Fraunces', Georgia, serif; }
        .font-sans  { font-family: 'DM Sans', system-ui, sans-serif; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>

      <NavBar />

      <section className="grid min-h-screen items-center gap-12 px-8 pb-20 pt-32 lg:grid-cols-2 lg:px-16">
        <div>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-500 dark:bg-orange-900/30 dark:text-orange-400">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            Plateforme de garde d&apos;animaux
          </span>
          <h1 className="font-serif text-5xl font-black leading-tight tracking-tight lg:text-6xl xl:text-7xl">
            La garde de votre animal,{" "}
            <em className="font-light not-italic text-teal-600 dark:text-teal-400">réinventée</em>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            Trouvez des prestataires de garde vérifiés près de chez vous. Réservez en quelques clics, suivez la prestation en temps réel et gardez l&apos;esprit tranquille.
          </p>
          <HeroCTAs />
        </div>

        <div className="flex justify-center">
          <ClerkProfileCard />
        </div>
      </section>
    </div>
  );
}