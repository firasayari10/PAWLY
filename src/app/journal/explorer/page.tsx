"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { AuthNavbar } from "@/components/auth-navbar";
import { JournalTabs } from "@/components/journal-tabs";
import type { PublicPost } from "@/lib/journal";
import { Globe, Search } from "lucide-react";
import { AnimalIcon } from "@/components/icons";

export default function ExplorerPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");

  const load = useCallback(async (titre: string, jour: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (titre) params.set("q", titre);
      if (jour) params.set("date", jour);
      const res = await fetch(`/api/journal/explore?${params}`);
      const data = await res.json();
      if (res.ok) setPosts(data.posts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) load("", "");
  }, [isLoaded, isSignedIn, load]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
      <AuthNavbar />
      <JournalTabs />
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <header className="mb-6">
          <h1 className="flex items-center gap-2.5 font-serif text-3xl font-black text-zinc-800 dark:text-zinc-100">
            <Globe className="h-7 w-7 text-teal-600 dark:text-teal-400" aria-hidden /> Explorer
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Découvrez les journaux que la communauté a rendus publics.
          </p>
        </header>

        {/* Search bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); load(q, date); }}
          className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700/60 dark:bg-zinc-800"
        >
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Titre du journal</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Les aventures de Rex…"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button type="submit" className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
            Rechercher
          </button>
          {(q || date) && (
            <button
              type="button"
              onClick={() => { setQ(""); setDate(""); load("", ""); }}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-500 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-400"
            >
              Réinitialiser
            </button>
          )}
        </form>

        {/* Feed */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Search className="h-12 w-12 text-zinc-300 dark:text-zinc-600" aria-hidden />
            <p className="font-serif text-lg font-bold text-zinc-700 dark:text-zinc-300">Aucun post trouvé</p>
            <p className="max-w-xs text-sm text-zinc-400">Essayez un autre titre ou une autre date.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.entryId} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PostCard({ post }: { post: PublicPost }) {
  const cover = post.photos[0];
  return (
    <Link
      href={`/journal/public/${post.publicSlug}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-700/60 dark:bg-zinc-800"
    >
      {/* Image (Instagram-style square) */}
      <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-700/40">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt={post.titre} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <AnimalIcon type={post.typeAnimal} className="h-14 w-14 text-zinc-300 dark:text-zinc-600" />
          </div>
        )}
        {post.photos.length > 1 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
            1/{post.photos.length}
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <AnimalIcon type={post.typeAnimal} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{post.journalTitre}</p>
          <p className="truncate text-[11px] text-zinc-400">
            {post.nomAnimal} · par {post.auteurPrenom || "Anonyme"}
          </p>
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 pb-4 pt-2">
        <p className="font-serif text-sm font-bold text-zinc-800 dark:text-zinc-100">{post.titre}</p>
        {post.contenu && (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">{post.contenu}</p>
        )}
        <time className="mt-2 block text-[11px] text-zinc-400">
          {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </time>
      </div>
    </Link>
  );
}
