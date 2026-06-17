"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  AtSign,
  Camera,
  Cat,
  Check,
  ClipboardList,
  Dog,
  Globe,
  House,
  IdCard,
  Lock,
  MapPin,
  PawPrint,
  Search,
  Shield,
  Star,
  Stethoscope,
  Sun,
  TreePine,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimalIcon, BrandPaw } from "@/components/icons";

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

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

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, revealed } = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STATIC DATA
// ══════════════════════════════════════════════════════════════════════════════

const STATS = [
  { value: 12000, suffix: "+", label: "Prestataires vérifiés" },
  { value: 48000, suffix: "+", label: "Propriétaires satisfaits" },
  { value: 97,    suffix: "%", label: "Taux de satisfaction" },
  { value: 150,   suffix: "+", label: "Villes en France" },
];

const STEPS: { num: string; Icon: LucideIcon; title: string; desc: string }[] = [
  { num: "01", Icon: Search,        title: "Cherchez près de chez vous", desc: "Entrez votre ville et vos dates. Notre algorithme vous propose les prestataires les mieux notés dans un rayon de 10 km." },
  { num: "02", Icon: ClipboardList, title: "Consultez les profils vérifiés", desc: "Lisez les avis, vérifiez les certifications, envoyez un message. Chaque prestataire est approuvé manuellement par notre équipe." },
  { num: "03", Icon: Shield,        title: "Réservez l'esprit tranquille", desc: "Paiement sécurisé sous séquestre, e-journal quotidien avec photos, suivi en temps réel. Votre animal est entre de bonnes mains." },
];

const FEATURES = [
  {
    tag: "E-Journal",
    title: "Chaque jour,\ndes nouvelles de votre animal",
    desc: "Photos, vidéos, messages. Votre gardien partage les moments de bonheur de votre compagnon au quotidien. Voyagez sereinement, votre animal garde le sourire.",
    flip: false,
    visual: "journal" as const,
  },
  {
    tag: "Confiance",
    title: "Des gardiens vérifiés,\ndes soins professionnels",
    desc: "Vérification d'identité, extrait de casier judiciaire, formation aux premiers secours animaux. Chaque prestataire est approuvé manuellement avant publication.",
    flip: true,
    visual: "verified" as const,
  },
  {
    tag: "Paiement",
    title: "Payez en sécurité,\nremboursement garanti",
    desc: "Votre paiement est conservé sous séquestre et libéré uniquement à la fin de la prestation. En cas d'imprévus, notre équipe vous accompagne.",
    flip: false,
    visual: "payment" as const,
  },
];

const TESTIMONIALS = [
  { name: "Sophie M.", city: "Paris 15e", pet: "Golden Retriever", avatar: "S", color: "from-sky-300 to-teal-400", rating: 5, text: "J'ai trouvé la gardienne parfaite en moins de 10 minutes. Les photos quotidiennes du e-journal m'ont permis de partir en vacances totalement sereine. Je recommande Pawly à tous les amoureux des animaux !" },
  { name: "Thomas L.", city: "Lyon 3e",  pet: "Prestataire certifié", avatar: "T", color: "from-violet-300 to-purple-400", rating: 5, text: "En tant que prestataire, Pawly m'a permis de développer mon activité et de rencontrer des familles formidables. Le système de paiement sécurisé est vraiment rassurant." },
  { name: "Amélie R.", city: "Bordeaux", pet: "Abyssin",            avatar: "A", color: "from-orange-300 to-rose-400",  rating: 5, text: "Mon chat Mochi a été choyé pendant mes deux semaines de vacances. La gardienne lui a même appris des petits tours ! Le e-journal avec les photos m'a rendu heureuse chaque jour." },
  { name: "Marc D.",   city: "Nantes",   pet: "Berger Australien",  avatar: "M", color: "from-emerald-300 to-teal-400", rating: 5, text: "Application très intuitive, réservation en 3 minutes chrono. Le suivi en temps réel et les messages rassurants du gardien ont fait toute la différence. Mon chien était aux anges !" },
  { name: "Chloé B.",  city: "Marseille",pet: "Lapin nain",         avatar: "C", color: "from-pink-300 to-rose-400",    rating: 5, text: "Le e-journal avec les photos quotidiennes était absolument rassurant. Mon lapin était en de bonnes mains et je le voyais s'amuser chaque jour. Merci Pawly, vous avez changé ma façon de voyager !" },
];

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATED STAT COUNTER
// ══════════════════════════════════════════════════════════════════════════════

function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, revealed } = useReveal(0.3);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!revealed) return;
    const start = Date.now();
    const dur = 1800;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setDisplay(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [revealed, value]);
  return (
    <div ref={ref} className="text-center">
      <div className="font-serif text-4xl font-black text-teal-700 dark:text-teal-400 md:text-5xl">
        {display.toLocaleString("fr-FR")}{suffix}
      </div>
      <div className="mt-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE VISUALS (CSS-only mockups, no images needed)
// ══════════════════════════════════════════════════════════════════════════════

function JournalVisual() {
  return (
    <div className="relative mx-auto h-[340px] w-[340px] max-w-full">
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-sky-100 to-teal-50 dark:from-sky-950/40 dark:to-teal-950/20" />

      {/* Main card */}
      <div className="absolute top-5 left-5 right-5 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-100 dark:border-zinc-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-300 to-rose-400 flex items-center justify-center shrink-0">
            <Dog className="h-4.5 w-4.5 text-white" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">Rocky a eu sa promenade !</p>
            <p className="text-[10px] text-zinc-400">Marie · il y a 12 min</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {([
            { bg: "from-sky-100 to-sky-50 dark:from-sky-900/20 dark:to-sky-900/10", Icon: TreePine, cls: "text-sky-400" },
            { bg: "from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/10", Icon: Sun, cls: "text-amber-400" },
            { bg: "from-teal-100 to-teal-50 dark:from-teal-900/20 dark:to-teal-900/10", Icon: PawPrint, cls: "text-teal-400" },
          ] as { bg: string; Icon: LucideIcon; cls: string }[]).map(({ bg, Icon, cls }, i) => (
            <div key={i} className={`h-16 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${cls}`} aria-hidden />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 italic">
          &ldquo;Il a adoré le parc ! Mangé de bon appétit.&rdquo;
        </div>
      </div>

      {/* Location pill */}
      <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white dark:bg-zinc-900 shadow-md border border-zinc-100 dark:border-zinc-800 flex items-center gap-2.5 px-3 py-2.5">
        <MapPin className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
        <div>
          <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">Parc Montsouris, Paris</p>
          <p className="text-[10px] text-teal-600 dark:text-teal-400">Promenade en cours</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-500 font-medium">Live</span>
        </div>
      </div>
    </div>
  );
}

function VerifiedVisual() {
  const checks: [LucideIcon, string][] = [
    [IdCard, "Identité vérifiée"],
    [ClipboardList, "Casier judiciaire vierge"],
    [Stethoscope, "Premiers secours animaux"],
    [Shield, "Assurance responsabilité civile"],
  ];
  return (
    <div className="relative mx-auto h-[340px] w-[340px] max-w-full">
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20" />
      <div className="absolute top-5 inset-x-5 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-100 dark:border-zinc-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center font-serif text-xl font-bold text-white shrink-0">J</div>
          <div>
            <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100">Julie M.</p>
            <p className="text-[11px] text-teal-600 dark:text-teal-400">Pet Sitter Pro · Paris 11e</p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-800 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-400">
            <Check className="h-2.5 w-2.5" aria-hidden /> Vérifié
          </span>
        </div>
        {checks.map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-2.5 py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
            <Icon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
            <span className="text-xs text-zinc-600 dark:text-zinc-300 flex-1">{label}</span>
            <div className="h-5 w-5 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="h-3 w-3 text-green-500" aria-hidden />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentVisual() {
  return (
    <div className="relative mx-auto h-[340px] w-[340px] max-w-full">
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/20" />
      <div className="absolute top-5 inset-x-5 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-100 dark:border-zinc-800 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">Résumé de réservation</p>
        <div className="space-y-2.5 mb-4">
          {[["Garde à domicile · 5 jours", "175 €"], ["Frais de service", "8 €"]].map(([l, p]) => (
            <div key={l} className="flex justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">{l}</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{p}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-zinc-800 dark:text-zinc-100">Total</span>
            <span className="text-teal-600 dark:text-teal-400">183 €</span>
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 p-3 mb-4 text-center">
          <p className="flex items-center justify-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
            <Lock className="h-3 w-3 shrink-0" aria-hidden />
            <span>Paiement conservé sous séquestre jusqu&apos;à la fin de la garde</span>
          </p>
        </div>
        <button className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-semibold text-white hover:bg-teal-700 transition">
          Payer en toute sécurité
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HERO — FLOATING PROFILE CARD
// ══════════════════════════════════════════════════════════════════════════════

function HeroCard() {
  return (
    <div className="relative flex h-[540px] w-[380px] items-center justify-center select-none">
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-80 w-80 rounded-full bg-teal-400/15 blur-3xl dark:bg-teal-500/10" />
      </div>

      {/* Top mini-badge */}
      <div className="absolute left-0 top-14 z-20 flex animate-[float1_3.5s_ease-in-out_infinite] items-center gap-2.5 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md dark:border-zinc-700/60 dark:bg-zinc-900/90">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-teal-400">
          <Dog className="h-4 w-4 text-white" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Réservation confirmée</p>
          <p className="text-[11px] text-zinc-400">Sophie · il y a 2 min</p>
        </div>
        <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-green-400" />
      </div>

      {/* Main profile card */}
      <div className="relative z-10 w-72 overflow-hidden rounded-3xl border border-zinc-200/40 bg-white shadow-2xl shadow-zinc-900/10 dark:border-zinc-700/40 dark:bg-zinc-900 dark:shadow-black/40">
        <div className="relative bg-gradient-to-br from-teal-600 to-teal-400 p-6">
          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <Check className="h-3 w-3" aria-hidden /> Vérifié
          </span>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white/60 bg-gradient-to-br from-orange-300 to-rose-400 font-serif text-3xl font-bold text-white">
            J
          </div>
        </div>
        <div className="p-5">
          <p className="font-serif text-xl font-bold text-zinc-800 dark:text-zinc-100">Julie M.</p>
          <p className="mb-4 text-xs font-medium text-teal-600 dark:text-teal-400">Pet Sitter Professionnelle · Paris 11e</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[{ v: "247", l: "Gardes" }, { v: "4.9", l: "Note" }, { v: "98%", l: "Réponse" }].map(({ v, l }) => (
              <div key={l} className="rounded-xl bg-zinc-50 p-2.5 text-center dark:bg-zinc-800">
                <span className="block font-serif text-base font-bold text-zinc-800 dark:text-zinc-100">{v}</span>
                <span className="text-[10px] text-zinc-400">{l}</span>
              </div>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {[["chien", "Chiens"], ["chat", "Chats"], ["lapin", "Lapins"]].map(([type, tag]) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-500 dark:bg-orange-900/20 dark:text-orange-400">
                <AnimalIcon type={type} className="h-3 w-3" /> {tag}
              </span>
            ))}
          </div>
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="flex gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden />
              ))}
            </span>
            <span className="font-bold text-zinc-800 dark:text-zinc-100">4.99</span>
            <span className="text-zinc-400">(183 avis)</span>
          </div>
          <button className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600">
            Voir le profil complet
          </button>
        </div>
      </div>

      {/* Bottom mini-badge */}
      <div className="absolute bottom-10 right-0 z-20 flex animate-[float2_4.2s_ease-in-out_1s_infinite] items-center gap-2.5 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md dark:border-zinc-700/60 dark:bg-zinc-900/90">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-rose-400">
          <Cat className="h-4 w-4 text-white" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">E-journal mis à jour</p>
          <p className="text-[11px] text-zinc-400">Caramel est en pleine forme !</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTIMONIALS CAROUSEL
// ══════════════════════════════════════════════════════════════════════════════

function Carousel() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  const go = useCallback((i: number) => {
    if (fading) return;
    setFading(true);
    setTimeout(() => { setIdx(i); setFading(false); }, 320);
  }, [fading]);

  useEffect(() => {
    const t = setInterval(() => go((idx + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, [idx, go]);

  const prev = () => go((idx - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => go((idx + 1) % TESTIMONIALS.length);

  const t = TESTIMONIALS[idx];

  return (
    <div className="relative">
      {/* Card */}
      <div
        style={{ transition: "opacity 0.32s ease, transform 0.32s ease" }}
        className={`mx-auto max-w-2xl ${fading ? "opacity-0 scale-[0.97]" : "opacity-100 scale-100"}`}
      >
        <div className="rounded-3xl border border-zinc-200/60 bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 md:p-10">
          {/* Stars */}
          <div className="mb-5 flex gap-0.5 text-amber-400">
            {Array.from({ length: t.rating }).map((_, i) => (
              <svg key={i} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          {/* Quote */}
          <blockquote className="mb-8 text-lg font-light leading-relaxed text-zinc-700 dark:text-zinc-300">
            &ldquo;{t.text}&rdquo;
          </blockquote>
          {/* Author */}
          <div className="flex items-center gap-4">
            <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center font-serif text-lg font-bold text-white shrink-0`}>
              {t.avatar}
            </div>
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-100">{t.name}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.city} · {t.pet}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-center gap-6">
        <button onClick={prev} aria-label="Avis précédent" className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-teal-600 dark:hover:text-teal-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="flex gap-2">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-6 bg-teal-600 dark:bg-teal-400" : "w-1.5 bg-zinc-300 dark:bg-zinc-600"}`}
              aria-label={`Avis ${i + 1}`}
            />
          ))}
        </div>
        <button onClick={next} aria-label="Avis suivant" className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-teal-600 dark:hover:text-teal-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NAVBAR
// ══════════════════════════════════════════════════════════════════════════════

const NAV_LINKS: [string, string][] = [
  ["#how", "Comment ça marche"],
  ["#features", "Fonctionnalités"],
  ["#reviews", "Avis"],
];

function NavBar() {
  const { isSignedIn } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // A solid background is needed whenever the menu is open (mobile) or once scrolled
  const solid = scrolled || menuOpen;

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid
          ? "border-b border-zinc-200/60 bg-white/85 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/85"
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-6 py-4 lg:px-16">
        <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-black tracking-tight text-teal-700 dark:text-teal-400">
          <BrandPaw className="h-6 w-6" /><span>PAWLY</span>
        </Link>

        <ul className="hidden items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400 lg:flex">
          {NAV_LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="transition hover:text-teal-600 dark:hover:text-teal-400">{label}</a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {isSignedIn ? (
            <>
              <Link href="/landing" className="hidden text-sm font-medium text-zinc-500 transition hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400 sm:block">
                Mon espace
              </Link>
              <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "h-8 w-8" } }} />
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-zinc-500 transition hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400 sm:block">
                Se connecter
              </Link>
              <Link href="/signup" className="rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 sm:px-5">
                Commencer
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-teal-500 dark:hover:text-teal-400 lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              {menuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div className={`overflow-hidden transition-[max-height] duration-300 ease-out lg:hidden ${menuOpen ? "max-h-80" : "max-h-0"}`}>
        <ul className="flex flex-col gap-1 px-6 pb-4 pt-1">
          {NAV_LINKS.map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-teal-600 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-teal-400"
              >
                {label}
              </a>
            </li>
          ))}
          {!isSignedIn && (
            <li className="sm:hidden">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-teal-600 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-teal-400"
              >
                Se connecter
              </Link>
            </li>
          )}
          {isSignedIn && (
            <li className="sm:hidden">
              <Link
                href="/landing"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-teal-600 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-teal-400"
              >
                Mon espace
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function Home() {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-amber-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <NavBar />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative grid min-h-screen items-center gap-12 overflow-hidden px-6 pb-20 pt-32 lg:grid-cols-2 lg:px-16">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-teal-100/40 blur-3xl dark:bg-teal-900/10" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-orange-100/30 blur-3xl dark:bg-orange-900/10" />
        </div>

        <div className="relative z-10 animate-[fadeUp_0.8s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-500 backdrop-blur-sm dark:bg-orange-900/30 dark:text-orange-400">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            Plateforme de garde d&apos;animaux
          </div>
          <h1 className="font-serif text-5xl font-black leading-[1.08] tracking-tight lg:text-6xl xl:text-7xl">
            La garde de votre animal,{" "}
            <em className="font-light not-italic text-teal-600 dark:text-teal-400">réinventée</em>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            Trouvez des prestataires de garde vérifiés près de chez vous. Réservez en quelques clics, suivez la prestation en temps réel.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {isSignedIn ? (
              <>
                <Link href="/landing" className="rounded-full bg-teal-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-teal-200/60 transition hover:-translate-y-0.5 hover:bg-teal-700 dark:shadow-teal-900/40">
                  Trouver un gardien
                </Link>
                <Link href="/profile" className="rounded-full border border-zinc-300 px-8 py-4 text-sm font-semibold text-zinc-700 transition hover:border-teal-500 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-teal-500 dark:hover:text-teal-400">
                  Mon profil
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup" className="rounded-full bg-teal-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-teal-200/60 transition hover:-translate-y-0.5 hover:bg-teal-700 dark:shadow-teal-900/40">
                  Trouver un gardien
                </Link>
                <Link href="/signup?role=sitter" className="rounded-full border border-zinc-300 px-8 py-4 text-sm font-semibold text-zinc-700 transition hover:border-teal-500 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-teal-500 dark:hover:text-teal-400">
                  Devenir prestataire
                </Link>
              </>
            )}
          </div>

          {/* Trust indicators */}
          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["from-sky-300 to-teal-400", "from-orange-300 to-rose-400", "from-violet-300 to-purple-400", "from-emerald-300 to-teal-400"].map((grad, i) => (
                <div key={i} className={`h-8 w-8 rounded-full bg-gradient-to-br ${grad} border-2 border-white dark:border-zinc-950 flex items-center justify-center text-xs font-bold text-white`}>
                  {["S","T","A","M"][i]}
                </div>
              ))}
            </div>
            <div>
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-current" aria-hidden />
                ))}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">+48 000 propriétaires satisfaits</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex justify-center scale-[0.8] sm:scale-95 lg:scale-100 animate-[scaleIn_0.9s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
          <HeroCard />
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STATS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-y border-zinc-200/60 bg-white py-16 dark:border-zinc-800/60 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((s) => <StatCounter key={s.label} {...s} />)}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="how" className="px-6 py-24 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-16 text-center">
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">Comment ça marche</span>
            <h2 className="font-serif text-4xl font-black tracking-tight lg:text-5xl">Simple comme bonjour</h2>
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">En trois étapes, votre animal est entre de bonnes mains.</p>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 100}>
                <div className="group relative h-full rounded-2xl border border-zinc-200/60 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-800">
                  {/* Large number watermark */}
                  <div className="mb-2 font-serif text-6xl font-black text-zinc-100 transition group-hover:text-teal-50 dark:text-zinc-800 dark:group-hover:text-teal-950">
                    {step.num}
                  </div>
                  <step.Icon className="mb-3 h-7 w-7 text-teal-600 dark:text-teal-400" aria-hidden />
                  <h3 className="mb-2 font-serif text-xl font-bold text-zinc-800 dark:text-zinc-100">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEATURES (alternating)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="features">
        {FEATURES.map((feat, i) => (
          <div
            key={feat.tag}
            className={`px-6 py-20 lg:px-16 ${i % 2 === 0 ? "bg-amber-50 dark:bg-zinc-950" : "bg-white dark:bg-zinc-900"}`}
          >
            <div className="mx-auto max-w-5xl">
              <div className={`flex flex-col gap-12 md:flex-row md:items-center md:gap-20 ${feat.flip ? "md:flex-row-reverse" : ""}`}>
                {/* Text */}
                <div className="flex-1">
                  <Reveal>
                    <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">{feat.tag}</span>
                    <h2 className="font-serif text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                      {feat.title.split("\n").map((line, j) => (
                        <span key={j}>{line}{j === 0 && <br />}</span>
                      ))}
                    </h2>
                    <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-500 dark:text-zinc-400">{feat.desc}</p>
                    <Link
                      href="/signup"
                      className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-teal-600 transition hover:gap-3 dark:text-teal-400"
                    >
                      En savoir plus
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Link>
                  </Reveal>
                </div>
                {/* Visual */}
                <div className="flex-1 flex justify-center">
                  <Reveal delay={80}>
                    {feat.visual === "journal"  && <JournalVisual />}
                    {feat.visual === "verified" && <VerifiedVisual />}
                    {feat.visual === "payment"  && <PaymentVisual />}
                  </Reveal>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TESTIMONIALS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="reviews" className="bg-amber-50 px-6 py-24 dark:bg-zinc-950 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-12 text-center">
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">Témoignages</span>
            <h2 className="font-serif text-4xl font-black tracking-tight lg:text-5xl">
              Ils font confiance à Pawly
            </h2>
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">Des milliers de familles nous font confiance chaque jour.</p>
          </Reveal>
          <Reveal delay={80}>
            <Carousel />
          </Reveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CTA DUAL
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-white px-6 py-24 dark:bg-zinc-900 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-12 text-center">
            <h2 className="font-serif text-4xl font-black tracking-tight lg:text-5xl">Rejoignez la famille Pawly</h2>
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">+60 000 membres nous font déjà confiance en France.</p>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2">
            {/* Owner */}
            <Reveal delay={0}>
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-teal-700 p-9 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-300/30 dark:hover:shadow-teal-900/50">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                <PawPrint className="mb-5 h-12 w-12" aria-hidden />
                <h3 className="mb-2 font-serif text-2xl font-black">Je suis propriétaire</h3>
                <p className="mb-7 text-sm leading-relaxed text-teal-100">Trouvez le gardien idéal pour votre animal. Vérifiés, assurés, passionnés.</p>
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50">
                  Trouver un gardien
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </Reveal>
            {/* Sitter */}
            <Reveal delay={120}>
              <div className="group relative overflow-hidden rounded-3xl border-2 border-zinc-200 bg-white p-9 transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-teal-700">
                <House className="mb-5 h-12 w-12 text-teal-600 dark:text-teal-400" aria-hidden />
                <h3 className="mb-2 font-serif text-2xl font-black text-zinc-800 dark:text-zinc-100">Je suis prestataire</h3>
                <p className="mb-7 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Développez votre activité et rencontrez des familles formidables qui aiment leurs animaux.</p>
                <Link href="/signup?role=sitter" className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-teal-400 dark:hover:text-white">
                  Devenir prestataire
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOOTER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-zinc-200/60 bg-amber-50 px-6 py-16 dark:border-zinc-800/60 dark:bg-zinc-950 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 grid gap-10 md:grid-cols-4">
            <div>
              <p className="mb-3 flex items-center gap-1.5 font-serif text-xl font-black text-teal-700 dark:text-teal-400">
                <BrandPaw className="h-5 w-5" /> PAWLY
              </p>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">La plateforme de garde d&apos;animaux qui met la confiance au cœur de chaque réservation.</p>
              <div className="mt-4 flex gap-3">
                {([Globe, Camera, AtSign] as LucideIcon[]).map((Icon, i) => (
                  <a key={i} href="#" className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-teal-600">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: "Plateforme", links: ["Rechercher un gardien", "Devenir prestataire", "Comment ça marche", "Tarifs"] },
              { title: "Support",    links: ["Centre d'aide", "Contact", "Politique d'annulation", "Assurance"] },
              { title: "Légal",      links: ["Mentions légales", "Confidentialité", "CGU", "Cookies"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-zinc-500 transition hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-zinc-200/60 pt-6 dark:border-zinc-800/60 md:flex-row md:justify-between">
            <p className="text-xs text-zinc-400">&copy; {new Date().getFullYear()} PAWLY. Tous droits réservés.</p>
            <p className="flex items-center gap-1 text-xs text-zinc-400">
              Fait avec <PawPrint className="h-3 w-3" aria-hidden /> en France
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
