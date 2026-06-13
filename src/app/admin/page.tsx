"use client";

import { useCallback, useEffect, useState } from "react";
import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { Shield } from "lucide-react";
import { AuthNavbar } from "@/components/auth-navbar";

interface AdminUser {
  id_user: string;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  statut_compte: string;
  ville: string;
}
interface Stats { total: number; proprietaires: number; prestataires: number; suspendus: number }
interface Signalement {
  id: string;
  type: "profil" | "avis" | "reservation";
  cible_id: string;
  motif: string;
  statut: string;
  created_at: string;
}

export default function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [signalements, setSignalements] = useState<Signalement[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/signalements"),
      ]);
      if (uRes.status === 403) { setForbidden(true); return; }
      const uData = await uRes.json();
      setUsers(uData.users ?? []);
      setStats(uData.stats ?? null);
      if (sRes.ok) setSignalements((await sRes.json()).signalements ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  const moderateUser = async (id: string, action: "suspendre" | "reactiver") => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) load();
  };

  const resolveSignalement = async (id: string, action: "resoudre" | "rejeter") => {
    const res = await fetch(`/api/admin/signalements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) load();
  };

  const deleteReview = async (avisId: string, signalementId: string) => {
    const res = await fetch(`/api/admin/reviews/${avisId}`, { method: "DELETE" });
    if (res.ok) await resolveSignalement(signalementId, "resoudre");
  };

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
      <AuthNavbar />
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-24">
        <h1 className="mb-6 flex items-center gap-2.5 font-serif text-3xl font-black text-zinc-800 dark:text-zinc-100">
          <Shield className="h-7 w-7 text-teal-600 dark:text-teal-400" aria-hidden /> Administration
        </h1>

        {forbidden ? (
          <p className="text-sm text-red-600">Accès réservé aux administrateurs.</p>
        ) : loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        ) : (
          <>
            {/* Stats */}
            {stats && (
              <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Utilisateurs" value={stats.total} />
                <StatCard label="Propriétaires" value={stats.proprietaires} />
                <StatCard label="Prestataires" value={stats.prestataires} />
                <StatCard label="Suspendus" value={stats.suspendus} accent="red" />
              </div>
            )}

            {/* Signalements */}
            <section className="mb-10">
              <h2 className="mb-3 font-serif text-lg font-bold text-zinc-700 dark:text-zinc-200">
                Signalements ({signalements.filter((s) => s.statut === "ouvert").length} ouverts)
              </h2>
              {signalements.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucun signalement.</p>
              ) : (
                <div className="space-y-2">
                  {signalements.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700/60 dark:bg-zinc-800">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          <span className="mr-2 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] uppercase text-orange-500 dark:bg-orange-900/20">{s.type}</span>
                          {s.motif}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">Cible : {s.cible_id}</p>
                      </div>
                      {s.statut === "ouvert" ? (
                        <div className="flex gap-2">
                          {s.type === "avis" && (
                            <button onClick={() => deleteReview(s.cible_id, s.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                              Supprimer l&apos;avis
                            </button>
                          )}
                          <button onClick={() => resolveSignalement(s.id, "resoudre")} className="rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                            Résoudre
                          </button>
                          <button onClick={() => resolveSignalement(s.id, "rejeter")} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700">
                            Rejeter
                          </button>
                        </div>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">{s.statut}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Users */}
            <section>
              <h2 className="mb-3 font-serif text-lg font-bold text-zinc-700 dark:text-zinc-200">Utilisateurs</h2>
              <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-2.5">Nom</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Rôle</th>
                      <th className="px-4 py-2.5">Statut</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {users.map((u) => (
                      <tr key={u.id_user} className="bg-white dark:bg-zinc-900">
                        <td className="px-4 py-2.5 font-medium text-zinc-800 dark:text-zinc-100">{u.prenom} {u.nom}</td>
                        <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{u.email}</td>
                        <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{u.role}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            u.statut_compte === "suspendu"
                              ? "bg-red-50 text-red-600 dark:bg-red-900/20"
                              : "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                          }`}>
                            {u.statut_compte ?? "actif"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {u.role !== "admin" && (
                            u.statut_compte === "suspendu" ? (
                              <button onClick={() => moderateUser(u.id_user, "reactiver")} className="rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                                Réactiver
                              </button>
                            ) : (
                              <button onClick={() => moderateUser(u.id_user, "suspendre")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                                Suspendre
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: "red" }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700/60 dark:bg-zinc-800">
      <p className={`font-serif text-3xl font-black ${accent === "red" ? "text-red-500" : "text-teal-600 dark:text-teal-400"}`}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
    </div>
  );
}
