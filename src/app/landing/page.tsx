"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { RedirectToSignIn, useAuth, useUser } from "@clerk/nextjs";
import { useSyncClerkUser } from "../profile/sync-user";
import { AuthNavbar } from "@/components/auth-navbar";

// ── Scroll reveal ──────────────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setRevealed(true); ob.disconnect(); } },
      { threshold }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold]);
  return { ref, revealed };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, revealed } = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Testimonials data ─────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: "Sophie M.", city: "Paris 15e", pet: "🐕 Golden Retriever", avatar: "S", color: "from-sky-300 to-teal-400", rating: 5, text: "J'ai trouvé la gardienne parfaite en moins de 10 minutes. Les photos quotidiennes du e-journal m'ont permis de partir en vacances totalement sereine." },
  { name: "Thomas L.", city: "Lyon 3e",  pet: "🐾 Prestataire certifié", avatar: "T", color: "from-violet-300 to-purple-400", rating: 5, text: "En tant que prestataire, Pawly m'a permis de développer mon activité et de rencontrer des familles formidables. Le système de paiement sécurisé est rassurant." },
  { name: "Amélie R.", city: "Bordeaux", pet: "🐱 Abyssin", avatar: "A", color: "from-orange-300 to-rose-400", rating: 5, text: "Mon chat Mochi a été choyé pendant mes deux semaines. La gardienne lui a même appris des petits tours ! Le e-journal avec les photos m'a rendu heureuse chaque jour." },
  { name: "Marc D.",   city: "Nantes",   pet: "🐕 Berger Australien", avatar: "M", color: "from-emerald-300 to-teal-400", rating: 5, text: "Application très intuitive, réservation en 3 minutes. Le suivi en temps réel et les messages rassurants du gardien ont fait toute la différence." },
];

// ── Quick action cards data ───────────────────────────────────────────────────
const ACTIONS = [
  { emoji: "🔍", label: "Trouver un gardien", sub: "Cherchez près de chez vous", href: "/search", color: "from-teal-500 to-teal-600", light: false },
  { emoji: "📅", label: "Mes réservations",  sub: "Gérez vos réservations", href: "/bookings", color: "from-violet-500 to-purple-600", light: false },
  { emoji: "👤", label: "Mon profil",         sub: "Modifiez vos informations", href: "/profile", color: "", light: true },
  { emoji: "🐾", label: "Mes animaux",        sub: "Gérez vos compagnons", href: "/animals", color: "", light: true },
];

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "12 000+", label: "Prestataires vérifiés" },
  { value: "48 000+", label: "Propriétaires satisfaits" },
  { value: "4.9 / 5", label: "Note moyenne" },
  { value: "150+",    label: "Villes en France" },
];

// ── Carousel ──────────────────────────────────────────────────────────────────
function Carousel() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  const go = useCallback((i: number) => {
    if (fading) return;
    setFading(true);
    setTimeout(() => { setIdx(i); setFading(false); }, 300);
  }, [fading]);

  useEffect(() => {
    const t = setInterval(() => go((idx + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, [idx, go]);

  const t = TESTIMONIALS[idx];
  return (
    <div>
      <div
        style={{ transition: "opacity 0.3s ease, transform 0.3s ease" }}
        className={`mx-auto max-w-2xl rounded-3xl border border-zinc-200/60 bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 md:p-10 ${fading ? "opacity-0 scale-[0.97]" : "opacity-100 scale-100"}`}
      >
        <div className="mb-5 flex gap-0.5 text-amber-400">
          {Array.from({ length: t.rating }).map((_, i) => (
            <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>
        <blockquote className="mb-8 text-lg font-light leading-relaxed text-zinc-700 dark:text-zinc-300">
          &ldquo;{t.text}&rdquo;
        </blockquote>
        <div className="flex items-center gap-4">
          <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center font-serif text-lg font-bold text-white shrink-0`}>{t.avatar}</div>
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">{t.name}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.city} · {t.pet}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-center gap-2">
        {TESTIMONIALS.map((_, i) => (
          <button key={i} onClick={() => go(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-6 bg-teal-600 dark:bg-teal-400" : "w-1.5 bg-zinc-300 dark:bg-zinc-600"}`} aria-label={`Avis ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  useSyncClerkUser();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  const firstName = user?.firstName || "là";

  return (
    <div className="min-h-screen bg-amber-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <AuthNavbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-16 pt-32 lg:px-16">
        {/* Glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-teal-100/30 blur-3xl dark:bg-teal-900/10" />
          <div className="absolute -bottom-20 left-0 h-[400px] w-[400px] rounded-full bg-orange-100/20 blur-3xl dark:bg-orange-900/10" />
        </div>

        <div className="relative mx-auto max-w-5xl animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
          {/* Greeting badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-500 dark:bg-orange-900/30 dark:text-orange-400">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            Bonjour, {firstName} !
          </div>

          <h1 className="font-serif text-5xl font-black leading-[1.08] tracking-tight text-zinc-800 dark:text-zinc-50 lg:text-6xl">
            Bienvenue sur{" "}
            <em className="font-light not-italic text-teal-600 dark:text-teal-400">PAWLY</em>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            Trouvez le gardien parfait pour votre animal, gérez vos réservations et suivez les prestations en temps réel.
          </p>

          {/* Trust row */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["from-sky-300 to-teal-400","from-orange-300 to-rose-400","from-violet-300 to-purple-400","from-emerald-300 to-teal-400"].map((g, i) => (
                <div key={i} className={`h-8 w-8 rounded-full bg-gradient-to-br ${g} border-2 border-white dark:border-zinc-950 flex items-center justify-center text-xs font-bold text-white`}>
                  {["S","T","A","M"][i]}
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">+48 000 propriétaires nous font confiance</p>
          </div>
        </div>
      </section>

      {/* ── QUICK ACTIONS ───────────────────────────────────────────────────── */}
      <section id="actions" className="px-6 py-12 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-8">
            <h2 className="font-serif text-2xl font-black text-zinc-800 dark:text-zinc-100">Actions rapides</h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {ACTIONS.map((a, i) => (
              <Reveal key={a.label} delay={i * 80}>
                <Link href={a.href} className={`group flex flex-col gap-3 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  a.light
                    ? "border border-zinc-200/60 bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-800 hover:border-teal-200"
                    : `bg-gradient-to-br ${a.color} text-white shadow-lg hover:shadow-teal-200/40 dark:hover:shadow-teal-900/40`
                }`}>
                  <span className="text-3xl">{a.emoji}</span>
                  <div>
                    <p className={`font-semibold text-sm ${a.light ? "text-zinc-800 dark:text-zinc-100" : "text-white"}`}>{a.label}</p>
                    <p className={`text-xs mt-0.5 ${a.light ? "text-zinc-500 dark:text-zinc-400" : "text-white/70"}`}>{a.sub}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAND ──────────────────────────────────────────────────────── */}
      <section className="border-y border-zinc-200/60 bg-white py-14 dark:border-zinc-800/60 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 80} className="text-center">
                <div className="font-serif text-3xl font-black text-teal-700 dark:text-teal-400 md:text-4xl">{s.value}</div>
                <div className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-12 text-center">
            <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">Comment ça marche</span>
            <h2 className="font-serif text-3xl font-black tracking-tight dark:text-zinc-50 lg:text-4xl">Simple comme bonjour</h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { num: "01", emoji: "🔍", title: "Cherchez près de chez vous", desc: "Entrez votre ville et vos dates. Notre algorithme propose les prestataires les mieux notés dans un rayon de 10 km." },
              { num: "02", emoji: "📋", title: "Consultez les profils vérifiés", desc: "Avis, certifications, prix. Chaque prestataire est approuvé manuellement avant publication sur la plateforme." },
              { num: "03", emoji: "🛡️", title: "Réservez l'esprit tranquille", desc: "Paiement sous séquestre, e-journal quotidien avec photos, suivi en temps réel. Votre animal entre de bonnes mains." },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 100}>
                <div className="group relative h-full rounded-2xl border border-zinc-200/60 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-800">
                  <div className="mb-1 font-serif text-5xl font-black text-zinc-100 transition group-hover:text-teal-50 dark:text-zinc-800 dark:group-hover:text-teal-950">{step.num}</div>
                  <div className="mb-2 text-2xl">{step.emoji}</div>
                  <h3 className="mb-2 font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-200/60 bg-white px-6 py-20 dark:border-zinc-800/60 dark:bg-zinc-900 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-12 text-center">
            <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">Fonctionnalités</span>
            <h2 className="font-serif text-3xl font-black tracking-tight dark:text-zinc-50 lg:text-4xl">Tout ce dont vous avez besoin</h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: "📸", title: "E-Journal quotidien",      desc: "Photos, vidéos et messages chaque jour pour suivre votre animal à distance." },
              { emoji: "✓",  title: "Prestataires vérifiés",   desc: "Identité, casier judiciaire, formation premiers secours. Tout est contrôlé." },
              { emoji: "🔒", title: "Paiement sécurisé",       desc: "Votre argent est protégé jusqu'à la fin de la prestation. Remboursement garanti." },
              { emoji: "📍", title: "Suivi en temps réel",     desc: "Localisez les promenades et suivez les activités de votre animal en direct." },
              { emoji: "⭐", title: "Avis vérifiés",           desc: "Chaque avis est déposé par un vrai propriétaire après une garde confirmée." },
              { emoji: "🤝", title: "Support 7j/7",            desc: "Notre équipe est disponible à tout moment pour vous accompagner." },
            ].map((feat, i) => (
              <Reveal key={feat.title} delay={i * 60}>
                <div className="group rounded-2xl border border-zinc-200/60 bg-amber-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-md dark:border-zinc-700/60 dark:bg-zinc-800 dark:hover:border-teal-800">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm dark:bg-zinc-700">{feat.emoji}</div>
                  <h3 className="mb-1.5 font-serif text-base font-bold text-zinc-800 dark:text-zinc-100">{feat.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{feat.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section id="reviews" className="px-6 py-20 dark:bg-zinc-950 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-10 text-center">
            <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">Témoignages</span>
            <h2 className="font-serif text-3xl font-black tracking-tight dark:text-zinc-50 lg:text-4xl">Ils font confiance à Pawly</h2>
          </Reveal>
          <Reveal delay={60}><Carousel /></Reveal>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-200/60 bg-white px-6 py-16 dark:border-zinc-800/60 dark:bg-zinc-900 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-teal-700 p-10 text-white md:p-14">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-serif text-3xl font-black lg:text-4xl">Prêt à trouver un gardien ?</h2>
                  <p className="mt-2 text-teal-100">Des milliers de prestataires vérifiés vous attendent.</p>
                </div>
                <Link href="/search" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-teal-700 shadow-lg transition hover:bg-teal-50 hover:shadow-xl">
                  Rechercher maintenant
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200/60 bg-amber-50 px-6 py-12 dark:border-zinc-800/60 dark:bg-zinc-950 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <p className="mb-2 font-serif text-lg font-black text-teal-700 dark:text-teal-400">🐾 PAWLY</p>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">La plateforme de garde d&apos;animaux qui met la confiance au cœur de chaque réservation.</p>
            </div>
            {[
              { title: "Plateforme",  links: ["Rechercher", "Devenir prestataire", "Comment ça marche"] },
              { title: "Mon compte",  links: ["Mon profil", "Mes réservations", "Mes animaux"] },
              { title: "Support",     links: ["Centre d'aide", "Contact", "CGU"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}><a href="#" className="text-sm text-zinc-500 transition hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-zinc-200/60 pt-6 dark:border-zinc-800/60 md:flex-row md:justify-between">
            <p className="text-xs text-zinc-400">&copy; {new Date().getFullYear()} PAWLY. Tous droits réservés.</p>
            <p className="text-xs text-zinc-400">Fait avec 🐾 en France</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
