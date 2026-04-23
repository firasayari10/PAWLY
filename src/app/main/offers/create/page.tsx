"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/components/navbar/Navbar";

export default function CreateOfferPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    type_service: "" as "hebergement" | "promenade" | "visite" | "",
    prix_jour: "",
    animaux_acceptes: [] as string[],
    ville_offre: "",
  });

  const toggleAnimal = (animal: string) => {
    setFormData(prev => ({
      ...prev,
      animaux_acceptes: prev.animaux_acceptes.includes(animal)
        ? prev.animaux_acceptes.filter(a => a !== animal)
        : [...prev.animaux_acceptes, animal]
    }));
  };

  const handlePublish = async () => {
    setLoading(true);
    // Simulation d'envoi
    setTimeout(() => {
      setLoading(false);
      router.push("/main/search");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-20">
      <Navbar />
      <div className="max-w-4xl mx-auto pt-32 px-6">

        {/* Stepper simple */}
        <div className="flex gap-4 mb-10">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-teal-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-[3rem] border border-[#E8DDD0] p-10 shadow-sm">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-3xl font-black text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Quel service proposez-vous ?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["hebergement", "promenade", "visite"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, type_service: type as any })}
                    className={`p-8 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${formData.type_service === type ? 'border-teal-600 bg-teal-50' : 'border-gray-50 text-gray-400'}`}
                  >
                    <span className="text-3xl">{type === "hebergement" ? "🏠" : type === "promenade" ? "🦮" : "🐈"}</span>
                    <span className="font-black text-[10px] uppercase tracking-widest">{type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-3xl font-black text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Détails de l'annonce</h2>
              <input
                type="text"
                placeholder="Titre de l'annonce"
                className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold"
                value={formData.titre}
                onChange={e => setFormData({...formData, titre: e.target.value})}
              />
              <textarea
                placeholder="Description..."
                className="w-full p-6 rounded-[2rem] bg-gray-50 border-none font-medium min-h-[150px]"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-3xl font-black text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Prix & Ville</h2>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Prix/jour (€)" className="p-4 rounded-2xl bg-gray-50 font-bold" onChange={e => setFormData({...formData, prix_jour: e.target.value})} />
                <input type="text" placeholder="Ville" className="p-4 rounded-2xl bg-gray-50 font-bold" onChange={e => setFormData({...formData, ville_offre: e.target.value})} />
              </div>
            </div>
          )}

          <div className="mt-10 flex justify-between">
            {step > 1 && <button onClick={() => setStep(step - 1)} className="text-gray-400 font-black uppercase text-xs">Retour</button>}
            <button
              onClick={step === 3 ? handlePublish : () => setStep(step + 1)}
              className="ml-auto bg-teal-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-lg"
            >
              {step === 3 ? (loading ? "..." : "Publier") : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}