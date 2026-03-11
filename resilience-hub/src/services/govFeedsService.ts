import { getApiBase } from "@/lib/apiBase";
import type { LiveIncident } from "@/services/liveBoardService";

const API_BASE = getApiBase();

interface GovFeedResponse {
  incidents: LiveIncident[];
  sources: Record<string, { count: number; error: string | null }>;
  last_updated: string;
}

export async function fetchGovernmentIncidents(limit = 20): Promise<GovFeedResponse> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  const response = await fetch(`${API_BASE}/public/gov-feeds/aggregate?limit=${limit}`, {
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timer));
  if (!response.ok) {
    throw new Error(`Gov feed unavailable: ${response.status}`);
  }
  return response.json();
}
