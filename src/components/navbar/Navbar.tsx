"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Sécurité hydratation
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const navLinks = [
    { name: "Accueil", href: "/main/landing" },
    { name: "Rechercher", href: "/main/search" },
    { name: "Créer une offre", href: "/main/offers/create" }, // URL synchronisée
  ];

  if (!hasMounted || !isLoaded) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300">
      <div className="mx-auto max-w-7xl mt-4 px-4">
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg shadow-teal-900/5 rounded-[2rem] px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <Link href="/main/landing" className="flex items-center gap-2 text-2xl font-black tracking-tighter hover:scale-105 transition-transform" style={{ fontFamily: "'Fraunces', serif", color: "#1E7A6B" }}>
            <span className="text-3xl">🐾</span> PAWLY
          </Link>

          {/* Nav Desktop */}
          <div className="hidden md:flex items-center gap-2 bg-[#F8F5F0] p-1.5 rounded-2xl border border-[#E8DDD0]/50">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  pathname === link.href ? "bg-white text-teal-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Profil & Actions */}
          <div className="flex items-center gap-3">
            {user && (
              <Link
                href="/main/profile"
                className={`hidden sm:block px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all border-2 ${
                  pathname === "/main/profile" ? "bg-teal-50 border-teal-100 text-teal-700" : "bg-white border-transparent text-gray-500 hover:bg-gray-50"
                }`}
              >
                Mon Profil
              </Link>
            )}
            <div className="h-8 w-[1px] bg-gray-200 mx-1 hidden sm:block" />
            <UserButton afterSignOutUrl="/" />

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden w-10 h-10 flex items-center justify-center bg-teal-50 text-teal-600 rounded-xl">
              <span className="text-xl">{isMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-24 left-4 right-4 bg-white rounded-[2rem] p-6 shadow-2xl border border-[#E8DDD0] animate-in slide-in-from-top-4">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className={`p-4 rounded-2xl font-black uppercase text-sm ${pathname === link.href ? "bg-teal-50 text-teal-600" : "text-gray-500"}`}>
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}