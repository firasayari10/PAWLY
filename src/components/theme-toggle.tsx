"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Render placeholder to avoid layout shift during SSR
  if (!mounted) return <div className="h-9 w-9" aria-hidden />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 backdrop-blur-sm transition-all hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:border-teal-500 dark:hover:text-teal-400"
    >
      {isDark ? (
        /* Sun */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1"  x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1"  y1="12" x2="3"  y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
          <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Moon */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
