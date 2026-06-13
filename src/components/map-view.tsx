"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon paths broken by bundlers
const fixIcon = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  tarif?: number;
}

interface Props {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (id: string) => void;
}

export default function MapView({ markers, center = [46.6, 2.3], zoom = 5, onMarkerClick }: Props) {
  useEffect(() => { fixIcon(); }, []);

  
  const validMarkers = markers.filter((m) => m.lat !== 0 || m.lng !== 0);

  // If we have markers with real coords, center on them
  const mapCenter: [number, number] =
    validMarkers.length > 0
      ? [
          validMarkers.reduce((s, m) => s + m.lat, 0) / validMarkers.length,
          validMarkers.reduce((s, m) => s + m.lng, 0) / validMarkers.length,
        ]
      : center;

  return (
    <MapContainer
      center={mapCenter}
      zoom={validMarkers.length > 0 ? 10 : zoom}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validMarkers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          eventHandlers={{ click: () => onMarkerClick?.(m.id) }}
        >
          <Popup>
            <div className="min-w-[140px]">
              <p className="font-semibold text-zinc-800">{m.label}</p>
              {m.sublabel && <p className="text-xs text-zinc-500">{m.sublabel}</p>}
              {m.tarif !== undefined && (
                <p className="mt-1 font-bold text-teal-600">{m.tarif} €/jour</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
