"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/journal", label: "Mon journal" },
  { href: "/journal/explorer", label: "Explorer" },
];

/**
 * Secondary navigation bar that sits directly under the main AuthNavbar and
 * lets the user switch between their own journals and the public feed.
 */
export function JournalTabs() {
  const pathname = usePathname();
  const explorerActive = pathname.startsWith("/journal/explorer");
  const isActive = (href: string) =>
    href === "/journal/explorer" ? explorerActive : !explorerActive;

  return (
    <div className="sticky top-[64px] z-40 mt-[64px] border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 lg:px-16">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 py-3 text-sm font-medium transition ${
              isActive(t.href)
                ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                : "border-transparent text-zinc-500 hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
