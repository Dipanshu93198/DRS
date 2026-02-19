import { type Disaster } from "@/data/mockDisasters";

const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    alert: string | null;
    tsunami: number;
    title: string;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

function mapSeverity(mag: number): Disaster['severity'] {
  if (mag >= 7) return 'critical';
  if (mag >= 5.5) return 'high';
  if (mag >= 4) return 'moderate';
  return 'low';
}

function estimateAffected(mag: number): number {
  if (mag >= 7) return Math.floor(100000 + Math.random() * 500000);
  if (mag >= 5.5) return Math.floor(10000 + Math.random() * 50000);
  if (mag >= 4) return Math.floor(1000 + Math.random() * 10000);
  return Math.floor(100 + Math.random() * 2000);
}

export async function fetchUSGSEarthquakes(): Promise<Disaster[]> {
  try {
    const res = await fetch(USGS_URL);
    if (!res.ok) throw new Error(`USGS API error: ${res.status}`);
    const data = await res.json();

    return (data.features as USGSFeature[]).slice(0, 15).map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const mag = f.properties.mag;
      const severity = mapSeverity(mag);
      return {
        id: `usgs-${f.id}`,
        type: f.properties.tsunami ? 'tsunami' as const : 'earthquake' as const,
        name: f.properties.title,
        location: f.properties.place || 'Unknown',
        lat,
        lng,
        severity,
        magnitude: mag,
        affectedPopulation: estimateAffected(mag),
        deployedTeams: Math.floor(Math.random() * 20) + 2,
        timestamp: new Date(f.properties.time).toISOString(),
        description: `M${mag.toFixed(1)} earthquake detected. ${f.properties.tsunami ? 'Tsunami risk flagged.' : 'No tsunami risk.'} USGS live data.`,
        status: severity === 'critical' || severity === 'high' ? 'active' as const : 'monitoring' as const,
      };
    });
  } catch (err) {
    console.error("Failed to fetch USGS data:", err);
    return [];
  }
}
