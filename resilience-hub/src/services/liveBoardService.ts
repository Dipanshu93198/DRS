import { getApiBase } from "@/lib/apiBase";

export type LiveSeverity = "low" | "moderate" | "high" | "critical";

export interface LiveIncident {
  id: string;
  type: string;
  title: string;
  lat: number;
  lng: number;
  severity: LiveSeverity;
  status: string;
  affected_population: number;
  timestamp: string;
  source: string;
}

interface LiveBoardResponse {
  incidents: LiveIncident[];
  stats: {
    active: number;
    monitoring: number;
    resolved: number;
    affected_population: number;
  };
  last_updated: string;
}

const API_BASE = getApiBase();

export async function fetchLiveBoard(limit = 60): Promise<LiveBoardResponse> {
  const response = await fetch(`${API_BASE}/public/live-board?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch live board: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
