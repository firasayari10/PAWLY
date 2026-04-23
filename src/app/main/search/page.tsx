"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/navbar/Navbar";

const MapDisplay = dynamic(() => import("@/components/map/MapDisplay"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-50 animate-pulse flex items-center justify-center font-bold text-teal-800/30">CHARGEMENT DE LA CARTE...</div>
});

const mockOffers = [
  { id: 1, title: "Garde de chien - Paris 11e", price: 35, distance: 1.2, rating: 4.8, reviews: 12, type: "Chien", prestataire: "Julie M.", lat: 48.8566, lng: 2.3522, location: "Paris", availableDates: ["2026-04-10", "2026-04-11"], img: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400" },
  { id: 2, title: "Garde de chat - Paris 10e", price: 28, distance: 2.5, rating: 5.0, reviews: 8, type: "Chat", prestataire: "Thomas P.", lat: 48.8740, lng: 2.3590, location: "Paris", availableDates: ["2026-04-12"], img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400" },
  { id: 3, title: "Garde NAC + promenade", price: 45, distance: 0.8, rating: 4.9, reviews: 24, type: "Lapin", prestataire: "Sophie L.", lat: 48.8650, lng: 2.3800, location: "Paris", availableDates: ["2026-04-10"], img: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400" },
  { id: 4, title: "Pension canine plein air", price: 55, distance: 15.2, rating: 4.7, reviews: 42, type: "Chien", prestataire: "Marc A.", lat: 48.9362, lng: 2.3574, location: "Saint-Denis", availableDates: ["2026-04-11"], img: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=400" },
  { id: 5, title: "Expertise féline à domicile", price: 22, distance: 3.1, rating: 4.6, reviews: 15, type: "Chat", prestataire: "Emma R.", lat: 48.8400, lng: 2.3200, location: "Paris", availableDates: ["2026-04-12"], img: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400" },
  { id: 6, title: "Garde d'oiseaux exotiques", price: 20, distance: 4.5, rating: 5.0, reviews: 5, type: "Oiseau", prestataire: "Lucas V.", lat: 48.8200, lng: 2.3600, location: "Ivry", availableDates: ["2026-04-10"], img: "https://images.unsplash.com/photo-1552728089-57bdde30fc3b?w=400" },
  { id: 7, title: "Gardiennage de reptiles", price: 40, distance: 6.2, rating: 4.9, reviews: 10, type: "Reptile", prestataire: "Kevin S.", lat: 48.8800, lng: 2.2900, location: "Neuilly", availableDates: ["2026-04-13"], img: "https://images.unsplash.com/photo-1504197885-609741792ce7?w=400" },
  { id: 8, title: "Câlins pour hamsters", price: 15, distance: 1.1, rating: 4.5, reviews: 21, type: "Hamster", prestataire: "Chloé D.", lat: 48.8500, lng: 2.3700, location: "Paris", availableDates: ["2026-04-10"], img: "https://images.unsplash.com/photo-1548767791-9e468b700230?w=400" },
  { id: 9, title: "Promenade active Husky", price: 30, distance: 0.5, rating: 4.8, reviews: 33, type: "Chien", prestataire: "Alex G.", lat: 48.8600, lng: 2.3400, location: "Paris", availableDates: ["2026-04-11"], img: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400" },
  { id: 10, title: "Hôtel pour furets", price: 50, distance: 8.9, rating: 5.0, reviews: 14, type: "Furet", prestataire: "Marine B.", lat: 48.9000, lng: 2.3100, location: "Clichy", availableDates: ["2026-04-15"], img: "https://images.unsplash.com/photo-1615022702095-ff2c036f3360?w=400" },
];

export default function SearchPage() {
  const [view, setView] = useState<"list" | "map">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnimal, setSelectedAnimal] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [filteredOffers, setFilteredOffers] = useState(mockOffers);

  const handleSearch = () => {
    const results = mockOffers.filter((o) => {
      const matchLoc = searchTerm === "" || o.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = searchDate === "" || o.availableDates.includes(searchDate);
      const matchAni = selectedAnimal === "" || o.type === selectedAnimal;
      return matchLoc && matchDate && matchAni;
    });
    setFilteredOffers(results);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-20">
      <Navbar />
      <div className="max-w-7xl mx-auto pt-32 px-6">

        {/* HEADER & TOGGLE */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Trouvez le <span className="text-teal-600 italic">gardien idéal</span> 🐾
            </h1>
            <p className="text-gray-500 font-medium mt-2">Explorez {filteredOffers.length} offres disponibles.</p>
          </div>
          <div className="flex p-1.5 bg-white border border-[#E8DDD0] rounded-2xl shadow-sm">
            <button onClick={() => setView("list")} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${view === "list" ? "bg-teal-600 text-white shadow-lg" : "text-gray-400"}`}>📋 Liste</button>
            <button onClick={() => setView("map")} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${view === "map" ? "bg-teal-600 text-white shadow-lg" : "text-gray-400"}`}>📍 Carte</button>
          </div>
        </div>

        {/* FILTRES BAR */}
        <div className="bg-white rounded-[2.5rem] p-4 md:p-6 shadow-xl border border-[#E8DDD0] mb-12 flex flex-col md:flex-row gap-6 items-center">
          <div className="w-full md:flex-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-1 block">Date souhaitée</label>
            <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-teal-500 outline-none font-bold text-sm" />
          </div>
          <div className="w-full md:flex-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-1 block">Où habitez-vous ?</label>
            <input type="text" placeholder="Paris, Lyon..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-teal-500 outline-none font-bold text-sm" />
          </div>
          <div className="w-full md:w-48">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-1 block">Animal</label>
            <select value={selectedAnimal} onChange={(e) => setSelectedAnimal(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-teal-500 outline-none font-bold text-sm">
              <option value="">Tous</option>
              <option value="Chien">🐶 Chien</option>
              <option value="Chat">🐱 Chat</option>
              <option value="Lapin">🐰 Lapin</option>
              <option value="Oiseau">🦜 Oiseau</option>
              <option value="Reptile">🐍 Reptile</option>
            </select>
          </div>
          <button onClick={handleSearch} className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-lg transition-all active:scale-95">RECHERCHER</button>
        </div>

        {/* CONTENU : LISTE OU CARTE */}
        <div className="relative min-h-[600px]">
          {view === "list" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
              {filteredOffers.map((o) => (
                <div key={o.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-[#E8DDD0] hover:shadow-2xl transition-all group flex flex-col">
                  <div className="h-48 relative overflow-hidden">
                    <img src={o.img} alt={o.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm font-black text-teal-700">{o.price}€<small className="text-[10px]">/jr</small></div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex justify-between mb-4">
                      <span className="text-[10px] font-black uppercase bg-orange-50 text-orange-600 px-3 py-1 rounded-full">⭐ {o.rating} ({o.reviews})</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">📍 {o.distance} km</span>
                    </div>
                    <h3 className="font-black text-xl mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{o.title}</h3>
                    <p className="text-gray-500 text-sm mb-6 font-medium">Par <span className="text-gray-900 font-bold">{o.prestataire}</span></p>
                    <button className="w-full mt-auto py-4 border-2 border-teal-600/10 hover:bg-teal-600 hover:text-white text-teal-600 rounded-2xl font-black transition-all">Voir l'annonce</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border border-[#E8DDD0] h-[700px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
              <MapDisplay offers={filteredOffers} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}