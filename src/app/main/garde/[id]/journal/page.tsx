"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import Navbar from "@/components/navbar/Navbar";

export default function JournalPage() {
  const { user } = useUser();
  const params = useParams();
  const gardeId = params.id as string;

  const [entries, setEntries] = useState<any[]>([]);
  const [contenu, setContenu] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEntries = async () => {
    const res = await fetch(`/api/journal/get/${gardeId}`);
    const data = await res.json();
    setEntries(data.entries || []);
  };

  useEffect(() => {
    if (gardeId) loadEntries();
  }, [gardeId]);

  const handleSubmit = async () => {
    if (!contenu.trim()) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("contenu", contenu);
    formData.append("gardeId", gardeId);
    formData.append("prestataireId", user?.id || "");
    formData.append("proprietaireId", "");
    photos.forEach(p => formData.append("photos", p));

    await fetch("/api/journal/create", { method: "POST", body: formData });
    setContenu("");
    setPhotos([]);
    await loadEntries();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Navbar />
      <div className="pt-32 max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-black mb-2">📔 Journal de garde</h1>
        <p className="text-gray-500 mb-8">Partagez des nouvelles avec le propriétaire</p>

        {/* 添加新日志 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <textarea
            className="w-full p-4 border rounded-xl resize-none"
            rows={3}
            placeholder="Comment se passe la garde ? 🐾"
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
          />
          <div className="flex justify-between mt-4">
            <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-xl">
              📷 Ajouter photo
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhotos(Array.from(e.target.files || []))}
              />
            </label>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold"
            >
              {loading ? "Envoi..." : "Publier"}
            </button>
          </div>
          {photos.length > 0 && (
            <div className="flex gap-2 mt-3">
              {photos.map((p, i) => (
                <span key={i} className="text-sm text-teal-600">📸 {p.name}</span>
              ))}
            </div>
          )}
        </div>

        {/* 日志列表 */}
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-sm text-gray-400 mb-2">
                {new Date(entry.date_creation).toLocaleString()}
              </div>
              <p className="text-gray-800">{entry.contenu}</p>
              {entry.photos?.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {entry.photos.map((url: string, i: number) => (
                    <img key={i} src={url} className="w-24 h-24 object-cover rounded-xl" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}