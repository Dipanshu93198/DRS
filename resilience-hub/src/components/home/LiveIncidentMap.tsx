import { Fragment, useEffect, useMemo, useRef } from "react";
import { Circle, CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { LiveIncident } from "@/services/liveBoardService";

interface Props {
  incidents: LiveIncident[];
}

const severityRank: Record<LiveIncident["severity"], number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
};

const severityStyles: Record<LiveIncident["severity"], { color: string; radius: number; heat: number }> = {
  low: { color: "#32d4ff", radius: 5, heat: 45000 },
  moderate: { color: "#f7b500", radius: 7, heat: 85000 },
  high: { color: "#ff7a18", radius: 9, heat: 120000 },
  critical: { color: "#ff355e", radius: 11, heat: 180000 },
};

const commandCenters = [
  { name: "AEGIS North Atlantic", position: [40.7128, -74.006] as [number, number] },
  { name: "AEGIS Indo-Pacific", position: [28.6139, 77.209] as [number, number] },
  { name: "AEGIS Pacific Rim", position: [35.6762, 139.6503] as [number, number] },
];

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const initialFitDone = useRef(false);

  useEffect(() => {
    if (points.length === 0) {
      map.setView([22, 10], 2);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.35), {
      animate: initialFitDone.current,
      duration: initialFitDone.current ? 0.8 : undefined,
      padding: [24, 24],
    });
    initialFitDone.current = true;
  }, [map, points]);

  return null;
}

export default function LiveIncidentMap({ incidents }: Props) {
  const focused = useMemo(
    () =>
      [...incidents]
        .sort((a, b) => {
          const severityDelta = severityRank[b.severity] - severityRank[a.severity];
          if (severityDelta !== 0) return severityDelta;
          return b.affected_population - a.affected_population;
        })
        .slice(0, 18),
    [incidents],
  );

  const routes = useMemo(
    () =>
      focused.slice(0, 6).map((incident, index) => ({
        id: incident.id,
        from: commandCenters[index % commandCenters.length],
        to: [incident.lat, incident.lng] as [number, number],
      })),
    [focused],
  );

  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  const mapPoints = useMemo(
    () => [...focused.map((item) => [item.lat, item.lng] as [number, number]), ...commandCenters.map((item) => item.position)],
    [focused],
  );

  return (
    <div className="aegis-panel relative min-h-[420px] overflow-hidden rounded-[1.75rem] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/55">Live Incident Map</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Global response theatre</h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.26em] text-cyan-100/55">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
          <span>{focused.length > 0 ? "Heat signatures + rescue routes" : "Standby command grid"}</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.4rem] border border-cyan-400/15">
        <MapContainer
          center={[22, 10]}
          zoom={2}
          scrollWheelZoom={false}
          preferCanvas
          zoomAnimation={false}
          fadeAnimation={false}
          markerZoomAnimation={false}
          className="h-[350px] w-full bg-slate-950"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={mapPoints} />

          {focused.map((incident) => {
            const style = severityStyles[incident.severity];
            return (
              <Fragment key={`${incident.source}-${incident.id}`}>
                <Circle
                  center={[incident.lat, incident.lng]}
                  radius={style.heat}
                  renderer={canvasRenderer}
                  pathOptions={{ color: style.color, fillColor: style.color, fillOpacity: 0.08, weight: 0 }}
                />
                <CircleMarker
                  center={[incident.lat, incident.lng]}
                  radius={style.radius}
                  renderer={canvasRenderer}
                  pathOptions={{ color: style.color, fillColor: style.color, fillOpacity: 0.95, weight: 2 }}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">{incident.title}</p>
                      <p>Severity: {incident.severity}</p>
                      <p>Status: {incident.status}</p>
                      <p>Affected: {Intl.NumberFormat().format(incident.affected_population)}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              </Fragment>
            );
          })}

          {commandCenters.map((centerItem) => (
            <CircleMarker
              key={centerItem.name}
              center={centerItem.position}
              radius={6}
              renderer={canvasRenderer}
              pathOptions={{ color: "#67e8f9", fillColor: "#67e8f9", fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>{centerItem.name}</Popup>
            </CircleMarker>
          ))}

          {routes.map((route) => (
            <Polyline
              key={`${route.from.name}-${route.id}`}
              positions={[route.from.position, route.to]}
              renderer={canvasRenderer}
              pathOptions={{ color: "#4ade80", weight: 2, opacity: 0.7, dashArray: "8 12" }}
            />
          ))}
        </MapContainer>

        {focused.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/30 backdrop-blur-[1px]">
            <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/70 px-6 py-4 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-cyan-200/55">Telemetry standby</p>
              <p className="mt-2 text-sm text-slate-300/75">No incident coordinates are available yet. Command centers remain on watch.</p>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 scanline opacity-25" />
      </div>
    </div>
  );
}
