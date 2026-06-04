"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar/Navbar";

export default function AdminDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGardes: 0,
    signalements: 0,
    noteMoyenne: 0,
  });
  const [signalements, setSignalements] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then(setStats);
    fetch("/api/admin/avis")
      .then((res) => res.json())
      .then((data) => setSignalements(data.signalements || []));
  }, []);

  const handleModeration = async (avisId: string, action: "supprimer" | "ignorer") => {
    await fetch("/api/admin/avis", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avisId, action }),
    });
    setSignalements(signalements.filter((s) => s.id !== avisId));
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Navbar />
      <div className="pt-32 max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-black">📊 Dashboard Admin</h1>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-6 mt-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div className="text-gray-500 text-sm">Utilisateurs</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="text-2xl mb-2">🏠</div>
            <div className="text-2xl font-bold">{stats.totalGardes}</div>
            <div className="text-gray-500 text-sm">Gardes</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-2xl font-bold">{stats.signalements}</div>
            <div className="text-gray-500 text-sm">Signalements</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="text-2xl mb-2">⭐</div>
            <div className="text-2xl font-bold">{stats.noteMoyenne}</div>
            <div className="text-gray-500 text-sm">Note moyenne</div>
          </div>
        </div>

        {/* 举报列表 */}
        <h2 className="text-xl font-bold mt-10 mb-4">🚨 Signalements en attente</h2>
        <div className="space-y-3">
          {signalements.map((s) => (
            <div key={s.id} className="bg-white p-4 rounded-xl flex justify-between items-center">
              <div>
                <div className="font-bold">{s.commentaire}</div>
                <div className="text-sm text-gray-400">Raison: {s.raison_signalement}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleModeration(s.id, "ignorer")}
                  className="px-4 py-2 bg-gray-100 rounded-xl text-sm"
                >
                  Ignorer
                </button>
                <button
                  onClick={() => handleModeration(s.id, "supprimer")}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}