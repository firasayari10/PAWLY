"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Correction des icônes Leaflet pour le rendu Web
const customIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Gère le déplacement fluide de la carte lors des recherches
function MapUpdater({ offers }: { offers: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (offers.length > 0) {
      map.setView([offers[0].lat, offers[0].lng], 12, { animate: true });
    }
  }, [offers, map]);
  return null;
}

export default function MapDisplay({ offers }: { offers: any[] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={12}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater offers={offers} />
        {offers.map((offer) => (
          <Marker key={offer.id} position={[offer.lat, offer.lng]} icon={customIcon}>
            <Popup>
              <div className="p-1 font-sans">
                <p className="font-black text-gray-900">{offer.title}</p>
                <p className="text-teal-600 font-bold">{offer.price}€/j</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}