"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const initialRole = searchParams.get("role") as "proprietaire" | "prestataire" | null;

  const [role, setRole] = useState<"proprietaire" | "prestataire">(initialRole || "proprietaire");
  const [statut, setStatut] = useState<"particulier" | "professionnel">("particulier");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");

  // Documents
  const [idFile, setIdFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string>("");
  const [insurancePreview, setInsurancePreview] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialRole) setRole(initialRole);
  }, [initialRole]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "id" | "insurance") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "id") {
      setIdFile(file);
      setIdPreview(URL.createObjectURL(file));
    } else {
      setInsuranceFile(file);
      setInsurancePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        userId: user.id,
        role,
        statut,
        telephone,
        adresse,
        code_postal: codePostal,
        ville,
        bio: "",
        animaux_acceptes: [],
        services: [],
      };

      const res = await fetch("/api/profile/complete-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la création du profil");
      }

      router.push("/main/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
      <div className="animate-bounce text-teal-600 font-bold">🐾 Chargement...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-16 px-6 relative overflow-hidden">

      {/* Blobs décoratifs en rappel de la page de choix du rôle */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-teal-500/10 blur-[80px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-orange-500/10 blur-[80px] rounded-full" />

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-teal-900/5 p-8 md:p-12 border border-[#E8DDD0]">

          <div className="text-center mb-10">
            <span className="text-5xl mb-4 block animate-pulse">✨</span>
            <h1 className="text-4xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              Dernière étape !
            </h1>
            <p className="text-gray-500 font-medium italic">Nous vérifions chaque profil pour la sécurité des animaux.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">

            {/* SÉLECTION RÔLE & STATUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Votre rôle</label>
                <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
                  <button
                    type="button"
                    onClick={() => setRole("proprietaire")}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${role === "proprietaire" ? "bg-white text-teal-600 shadow-sm" : "text-gray-400"}`}
                  >
                    🏠 Propriétaire
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("prestataire")}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${role === "prestataire" ? "bg-white text-orange-600 shadow-sm" : "text-gray-400"}`}
                  >
                    🐾 Pet-sitter
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Type de compte</label>
                <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
                  <button
                    type="button"
                    onClick={() => setStatut("particulier")}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${statut === "particulier" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
                  >
                    👤 Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatut("professionnel")}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${statut === "professionnel" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
                  >
                    🏢 Pro
                  </button>
                </div>
              </div>
            </div>

            <hr className="border-gray-50" />

            {/* CONTACT & ADRESSE */}
            <div className="space-y-6">
              <div className="group">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2 block mb-2">Téléphone</label>
                <input
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2 block mb-2">Adresse</label>
                  <input
                    type="text"
                    required
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:bg-white focus:border-teal-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2 block mb-2">CP</label>
                  <input
                    type="text"
                    required
                    value={codePostal}
                    onChange={(e) => setCodePostal(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:bg-white focus:border-teal-500 transition-all"
                  />
                </div>
              </div>
              <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2 block mb-2">Ville</label>
                  <input
                    type="text"
                    required
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:bg-white focus:border-teal-500 transition-all"
                  />
              </div>
            </div>

            <hr className="border-gray-50" />

            {/* DOCUMENTS */}
            <div className="space-y-6">
               <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-4">Vérification d'identité</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Pièce d'identité */}
                  <div className="relative group">
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer bg-gray-50 group-hover:bg-teal-50 transition-all">
                      {idPreview ? (
                        <img src={idPreview} className="w-full h-full object-cover rounded-3xl" alt="ID" />
                      ) : (
                        <div className="text-center p-4">
                          <span className="text-3xl mb-2 block">🪪</span>
                          <span className="text-xs font-bold text-gray-500 uppercase">Carte d'identité</span>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "id")} />
                    </label>
                  </div>

                  {/* Assurance */}
                  <div className="relative group">
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer bg-gray-50 group-hover:bg-orange-50 transition-all">
                      {insurancePreview ? (
                        <img src={insurancePreview} className="w-full h-full object-cover rounded-3xl" alt="Assurance" />
                      ) : (
                        <div className="text-center p-4">
                          <span className="text-3xl mb-2 block">🛡️</span>
                          <span className="text-xs font-bold text-gray-500 uppercase">Justificatif Assurance</span>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "insurance")} />
                    </label>
                  </div>
               </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-center font-bold text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-6 rounded-full text-white font-black text-lg transition-all shadow-xl active:scale-95
                ${loading ? "bg-gray-400" : "bg-teal-600 hover:bg-teal-700 shadow-teal-600/30"}`}
            >
              {loading ? "Création du profil..." : "Valider et commencer l'aventure →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}