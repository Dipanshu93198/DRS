import { getApiBase } from '../lib/apiBase';

const API_BASE = getApiBase();

export interface IncidentAssignmentDTO {
  id: number;
  disaster_key: string;
  owner: string;
  status: string;
  eta_minutes: number;
  sla_minutes: number;
  notes?: string | null;
  updated_by_user_id?: number | null;
  updated_by_name?: string | null;
  last_updated: string;
  created_at: string;
}

export interface AuditEventDTO {
  id: number;
  actor_name: string;
  actor_user_id?: number | null;
  mission_role: string;
  action: string;
  target: string;
  severity: 'info' | 'warning' | 'critical';
  details?: string | null;
  event_metadata?: Record<string, unknown> | null;
  created_at: string;
}

export async function listAssignments(token: string): Promise<IncidentAssignmentDTO[]> {
  const res = await fetch(`${API_BASE}/operations/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load assignments');
  return res.json();
}

export async function upsertAssignment(
  token: string,
  assignment: {
    disaster_key: string;
    owner: string;
    status: string;
    eta_minutes: number;
    sla_minutes: number;
    notes?: string;
  }
): Promise<IncidentAssignmentDTO> {
  const res = await fetch(`${API_BASE}/operations/assignments/${encodeURIComponent(assignment.disaster_key)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(assignment),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Assignment update failed' }));
    throw new Error(err.detail || 'Assignment update failed');
  }
  return res.json();
}

export async function listAuditEvents(token: string): Promise<AuditEventDTO[]> {
  const res = await fetch(`${API_BASE}/operations/audit`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load audit');
  return res.json();
}

export async function createAuditEvent(
  token: string,
  payload: {
    action: string;
    target: string;
    severity: 'info' | 'warning' | 'critical';
    details?: string;
    event_metadata?: Record<string, unknown>;
  }
): Promise<AuditEventDTO> {
  const res = await fetch(`${API_BASE}/operations/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Audit create failed' }));
    throw new Error(err.detail || 'Audit create failed');
  }
  return res.json();
}
