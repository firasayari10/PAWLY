import Link from "next/link";
import { PawPrint } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase-server";
import { BrandPaw } from "@/components/icons";

interface Photo { id: string; url: string }
interface Entry { id: string; titre: string; contenu: string; created_at: string; journal_photo?: Photo[] }
interface PublicJournal {
  titre: string;
  nom_animal: string;
  type_animal: string;
  is_public: boolean;
  created_at: string;
  journal_entry?: Entry[];
}

export default async function PublicJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("journal")
    .select(`
      titre, nom_animal, type_animal, is_public, created_at,
      journal_entry ( id, titre, contenu, created_at, journal_photo ( id, url ) )
    `)
    .eq("public_slug", slug)
    .maybeSingle();

  const journal = data as PublicJournal | null;

  if (!journal || journal.is_public !== true) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 px-6 text-center font-sans dark:bg-zinc-900">
        <PawPrint className="h-12 w-12 text-zinc-300 dark:text-zinc-600" aria-hidden />
        <h1 className="font-serif text-2xl font-bold text-zinc-700 dark:text-zinc-200">Journal introuvable</h1>
        <p className="text-sm text-zinc-500">Ce journal n&apos;existe pas ou n&apos;est pas public.</p>
        <Link href="/" className="mt-2 text-sm text-teal-600 hover:underline dark:text-teal-400">Retour à l&apos;accueil</Link>
      </div>
    );
  }

  const entries = (journal.journal_entry ?? []).slice().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
      <header className="border-b border-zinc-200/60 bg-white/80 px-6 py-4 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/80">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-black text-teal-700 dark:text-teal-400">
          <BrandPaw className="h-5 w-5" /><span>PAWLY</span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-10">
        <h1 className="font-serif text-4xl font-black text-zinc-800 dark:text-zinc-100">{journal.titre}</h1>
        <p className="mt-2 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
          <PawPrint className="h-3.5 w-3.5 shrink-0" aria-hidden /> {journal.nom_animal} · {journal.type_animal}
        </p>

        <div className="mt-8 space-y-5">
          {entries.length === 0 && <p className="text-sm text-zinc-400">Aucune entrée publiée.</p>}
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700/60 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">{entry.titre}</h2>
                <time className="text-xs text-zinc-400">{new Date(entry.created_at).toLocaleDateString("fr-FR")}</time>
              </div>
              {entry.contenu && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{entry.contenu}</p>}
              {entry.journal_photo && entry.journal_photo.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {entry.journal_photo.map((ph) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={ph.id} src={ph.url} alt="" className="h-32 w-full rounded-xl object-cover" />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
