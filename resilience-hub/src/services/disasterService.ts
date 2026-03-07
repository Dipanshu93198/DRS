import { getApiBase } from '../lib/apiBase';

const API_BASE = getApiBase();

export interface DisasterAlert {
  type: string;
  severity: string;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  source: string;
}

export interface DisasterAlertsResponse {
  alerts: DisasterAlert[];
  location: string;
  timestamp: string;
}

export async function fetchDisasterAlerts(lat: number, lon: number): Promise<DisasterAlertsResponse> {
  const response = await fetch(`${API_BASE}/disaster/alerts/${lat}/${lon}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch disaster alerts: ${response.statusText}`);
  }
  return response.json();
}