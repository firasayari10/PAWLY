"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandPaw } from "@/components/icons";

export function AuthNavbar() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const [isPrestataire, setIsPrestataire] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch role once on mount (and whenever the route changes so profile edits reflect immediately)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => {
        setIsPrestataire(
          profile?.role === "prestataire" && profile?.prestataire_profil != null,
        );
        setIsAdmin(profile?.role === "admin");
      })
      .catch(() => {});
  }, [isLoaded, isSignedIn, pathname]);

  const links: { href: string; label: string }[] = [
    { href: "/landing", label: "Accueil" },
    { href: "/search", label: "Rechercher" },
    { href: "/bookings", label: "Mes réservations" },
    { href: "/journal", label: "Journal" },
    { href: "/veterinaires", label: "Vétérinaires" },
    ...(isPrestataire ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
    { href: "/profile", label: "Mon profil" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/80">
      <div className="flex items-center justify-between px-6 py-4 lg:px-16">
        <Link
          href="/landing"
          className="flex items-center gap-2 font-serif text-xl font-black text-teal-700 dark:text-teal-400"
        >
          <BrandPaw className="h-5 w-5" /><span>PAWLY</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-6 text-sm font-medium text-zinc-500 dark:text-zinc-400 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`transition hover:text-teal-600 dark:hover:text-teal-400 ${
                  isActive(l.href) ? "text-teal-600 dark:text-teal-400" : ""
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <UserButton appearance={{ elements: { userButtonAvatarBox: "h-8 w-8" } }} />

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
      <div
        className={`overflow-hidden border-zinc-200/60 bg-white/95 backdrop-blur-xl transition-[max-height] duration-300 ease-out dark:border-zinc-800/60 dark:bg-zinc-950/95 lg:hidden ${
          menuOpen ? "max-h-72 border-t" : "max-h-0"
        }`}
      >
        <ul className="flex flex-col px-6 py-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive(l.href)
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                }`}
              >
                {l.label}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
