import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DISASTER_ICONS, type Disaster, type SeverityLevel } from "@/data/mockDisasters";
import { motion } from "framer-motion";

const severityRadius: Record<SeverityLevel, number> = {
  low: 8,
  moderate: 12,
  high: 16,
  critical: 22,
};

const severityColor: Record<SeverityLevel, string> = {
  low: '#22c55e',
  moderate: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

function FlyToDisaster({ disaster }: { disaster: Disaster | null }) {
  const map = useMap();
  useEffect(() => {
    if (disaster) {
      map.flyTo([disaster.lat, disaster.lng], 6, { duration: 1.5 });
    }
  }, [disaster, map]);
  return null;
}

interface DisasterMapProps {
  disasters: Disaster[];
  onSelectDisaster: (d: Disaster) => void;
  selectedDisaster: Disaster | null;
}

export default function DisasterMap({ disasters, onSelectDisaster, selectedDisaster }: DisasterMapProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="relative h-full w-full rounded-lg overflow-hidden border border-border border-glow"
    >
      <div className="absolute inset-0 z-[500] scanline pointer-events-none" />

      <MapContainer
        center={[20, 80]}
        zoom={3}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Dark">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri'
            />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay name="Weather (Clouds)">
            <TileLayer
              url="https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2"
              opacity={0.5}
            />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Weather (Precipitation)">
            <TileLayer
              url="https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2"
              opacity={0.5}
            />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Temperature">
            <TileLayer
              url="https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2"
              opacity={0.5}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <FlyToDisaster disaster={selectedDisaster} />

        {disasters.map((d) => (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lng]}
            radius={severityRadius[d.severity]}
            pathOptions={{
              color: severityColor[d.severity],
              fillColor: severityColor[d.severity],
              fillOpacity: 0.35,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onSelectDisaster(d),
            }}
          >
            <Popup>
              <div className="text-sm font-sans" style={{ color: '#0f172a' }}>
                <strong>{DISASTER_ICONS[d.type]} {d.name}</strong>
                <br />
                {d.location}
                {d.magnitude && <><br />Magnitude: <strong>{d.magnitude}</strong></>}
                <br />
                <span style={{ color: severityColor[d.severity], fontWeight: 600 }}>
                  {d.severity.toUpperCase()}
                </span>
                {d.id.startsWith('usgs-') && (
                  <><br /><em style={{ fontSize: '10px', color: '#666' }}>📡 USGS Live Data</em></>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </motion.div>
  );
}
