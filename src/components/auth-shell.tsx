"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { SignOutButton } from "@clerk/nextjs";
import type { Appearance } from "@clerk/types";
import { ThemeToggle } from "@/components/theme-toggle";

// ── Clerk appearance, brand-themed & dark-mode aware ────────────────────────────
// Clerk renders its own card; we strip its chrome so it sits cleanly inside the
// shell, then map our palette onto Clerk's CSS variables. The consuming pages
// gate on `isLoaded` (returning null on the server), so reading `resolvedTheme`
// here can't cause a hydration mismatch.
export function useClerkAppearance(): Appearance {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return {
    variables: {
      colorPrimary: "#2D9B8A",
      colorText: isDark ? "#fafafa" : "#1c1c1c",
      colorTextSecondary: isDark ? "#a1a1aa" : "#6b6b6b",
      colorBackground: isDark ? "#18181b" : "#ffffff",
      colorInputBackground: isDark ? "#27272a" : "#ffffff",
      colorInputText: isDark ? "#fafafa" : "#1c1c1c",
      colorDanger: "#ef4444",
      borderRadius: "0.85rem",
      fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
    },
    elements: {
      rootBox: "w-full",
      cardBox: "w-full shadow-none",
      card: "w-full bg-transparent shadow-none border-0 p-0 gap-6",
      header: "text-left",
      headerTitle: "font-serif text-2xl font-black tracking-tight",
      headerSubtitle: "text-sm",
      socialButtonsBlockButton:
        "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition rounded-xl",
      socialButtonsBlockButtonText: "font-medium",
      dividerLine: "bg-zinc-200 dark:bg-zinc-800",
      dividerText: "text-zinc-400",
      formFieldLabel: "font-medium text-zinc-600 dark:text-zinc-300",
      formFieldInput:
        "rounded-xl border-zinc-300 dark:border-zinc-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20",
      formButtonPrimary:
        "rounded-xl bg-teal-600 hover:bg-teal-700 text-sm font-semibold normal-case shadow-sm transition",
      footerActionLink:
        "text-teal-600 dark:text-teal-400 font-semibold hover:text-teal-700 dark:hover:text-teal-300",
      identityPreviewEditButton: "text-teal-600 dark:text-teal-400",
      formResendCodeLink: "text-teal-600 dark:text-teal-400",
      otpCodeFieldInput:
        "rounded-lg border-zinc-300 dark:border-zinc-600 focus:border-teal-500",
    },
  };
}

const BRAND_POINTS = [
  { icon: "✓", text: "Prestataires vérifiés manuellement" },
  { icon: "📸", text: "E-journal quotidien avec photos" },
  { icon: "🔒", text: "Paiement sécurisé sous séquestre" },
];

// ── Split-screen auth layout ────────────────────────────────────────────────────
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  switchPrompt,
  switchHref,
  switchLabel,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  switchPrompt: string;
  switchHref: string;
  switchLabel: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-amber-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 lg:flex-row">
      {/* ── Brand panel ── */}
      <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-600 to-teal-800 px-6 py-8 text-white lg:w-[44%] lg:px-12 lg:py-12">
        {/* decorative glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
        </div>

        <Link href="/" className="relative z-10 inline-flex items-center gap-2 font-serif text-2xl font-black tracking-tight">
          <span>🐾</span><span>PAWLY</span>
        </Link>

        {/* On large screens, a rich value-prop block. Hidden on mobile to keep the form above the fold. */}
        <div className="relative z-10 hidden lg:block">
          <h2 className="max-w-sm font-serif text-3xl font-black leading-tight">
            La garde de votre animal, <em className="font-light not-italic text-teal-100">réinventée</em>.
          </h2>
          <ul className="mt-8 space-y-4">
            {BRAND_POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-sm text-teal-50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm backdrop-blur-sm">
                  {p.icon}
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 hidden items-center gap-3 lg:flex">
          <div className="flex -space-x-2">
            {["from-sky-300 to-teal-400", "from-orange-300 to-rose-400", "from-violet-300 to-purple-400"].map((g, i) => (
              <div key={i} className={`h-8 w-8 rounded-full bg-gradient-to-br ${g} border-2 border-teal-700 text-center text-xs font-bold leading-7`}>
                {["S", "T", "A"][i]}
              </div>
            ))}
          </div>
          <p className="text-xs text-teal-100">+48 000 propriétaires nous font confiance</p>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="relative flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md animate-[fadeUp_0.6s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="mb-7">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-orange-500 dark:bg-orange-900/30 dark:text-orange-400">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              {eyebrow}
            </span>
            <h1 className="font-serif text-3xl font-black tracking-tight text-zinc-800 dark:text-zinc-50">{title}</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          </div>

          <div className="rounded-3xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
            {children}
          </div>

          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {switchPrompt}{" "}
            <Link href={switchHref} className="font-semibold text-teal-600 transition hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
              {switchLabel}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

// ── "Already signed in" state, branded & in French ──────────────────────────────
export function AlreadySignedIn({ signOutRedirect }: { signOutRedirect: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-amber-50 px-6 text-center font-sans dark:bg-zinc-950">
      <Link href="/" className="inline-flex items-center gap-2 font-serif text-3xl font-black tracking-tight text-teal-700 dark:text-teal-400">
        <span>🐾</span><span>PAWLY</span>
      </Link>
      <div>
        <p className="font-serif text-xl font-bold text-zinc-800 dark:text-zinc-100">Vous êtes déjà connecté</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Reprenez là où vous vous étiez arrêté.</p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/landing"
          className="rounded-full bg-teal-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-700"
        >
          Accéder à mon espace
        </Link>
        <SignOutButton redirectUrl={signOutRedirect}>
          <button className="rounded-full border border-zinc-300 px-7 py-3 text-sm font-semibold text-zinc-600 transition hover:border-teal-500 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-teal-500 dark:hover:text-teal-400">
            Changer de compte
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
