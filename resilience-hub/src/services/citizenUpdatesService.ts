import { getApiBase } from "@/lib/apiBase";

const API_BASE = getApiBase();

export interface CitizenUpdateItem {
  id: number;
  reporter_name: string | null;
  reporter_phone: string | null;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  status: "submitted" | "verified" | "rejected";
  review_note: string | null;
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export async function submitCitizenUpdate(input: {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  reporter_name?: string;
  reporter_phone?: string;
  image?: File | null;
}): Promise<{ id: number; status: string; message: string }> {
  const form = new FormData();
  form.append("title", input.title);
  form.append("description", input.description);
  form.append("category", input.category);
  form.append("latitude", String(input.latitude));
  form.append("longitude", String(input.longitude));
  if (input.reporter_name) form.append("reporter_name", input.reporter_name);
  if (input.reporter_phone) form.append("reporter_phone", input.reporter_phone);
  if (input.image) form.append("image", input.image);

  const response = await fetch(`${API_BASE}/public/citizen-updates`, {
    method: "POST",
    body: form,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || "Failed to submit citizen update");
  }
  return data;
}

export async function listCitizenUpdates(limit = 30): Promise<CitizenUpdateItem[]> {
  const response = await fetch(`${API_BASE}/public/citizen-updates?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch citizen updates: ${response.status}`);
  }
  return response.json();
}

export async function reviewCitizenUpdate(
  token: string,
  updateId: number,
  status: "verified" | "rejected",
  review_note?: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/operations/citizen-updates/${updateId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, review_note }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || "Failed to review citizen update");
  }
}

export function resolveCitizenImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;
  return `/${path}`;
}
