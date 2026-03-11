import { getApiBase } from "@/lib/apiBase";

const API_BASE = getApiBase();

export async function subscribeSmsAlerts(payload: {
  phone: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  consent_sms?: boolean;
}) {
  const response = await fetch(`${API_BASE}/alerts/sms/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || "Failed to subscribe SMS alerts");
  return data;
}

export async function sendEvacuationSms(
  token: string,
  payload: {
    incident_title: string;
    incident_latitude: number;
    incident_longitude: number;
    impact_radius_km: number;
    max_recipients: number;
  },
) {
  const response = await fetch(`${API_BASE}/alerts/sms/evacuate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || "Failed to dispatch evacuation SMS");
  return data;
}

export async function listSmsLogs(token: string, limit = 50) {
  const response = await fetch(`${API_BASE}/alerts/sms/logs?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || "Failed to load SMS logs");
  return data as Array<{
    id: number;
    incident_title: string;
    recipient_phone: string;
    status: string;
    provider: string;
    error: string | null;
    sent_at: string | null;
    created_at: string;
  }>;
}
