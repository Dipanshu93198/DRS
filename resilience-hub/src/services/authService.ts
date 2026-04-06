import { getApiBase } from '../lib/apiBase';

const API_BASE = getApiBase();

export type MissionRole = 'admin' | 'field' | 'analyst';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    mission_role: MissionRole;
    allowed_mission_roles: MissionRole[];
  };
}

interface SessionMe {
  id: number;
  name: string;
  email: string;
  role: string;
  mission_role: MissionRole;
  allowed_mission_roles: MissionRole[];
}

interface GoogleAuthConfigResponse {
  client_id?: string | null;
  configured?: boolean;
}

function toNetworkAuthError(): Error {
  return new Error(
    `Cannot connect to server at ${API_BASE}. ` +
    `Make sure the backend is running and the port is accessible from your browser. ` +
    `If you're using Codespaces run \`python3 ../start-all.py\` or forward port 8000 in the Ports panel.`
  );
}

function mapAuthHttpError(status: number, statusText: string, detail?: string): Error {
  if (detail && detail.trim() !== "") {
    return new Error(detail);
  }

  // In dev, Vite proxy returns 500 when backend is unreachable.
  if (API_BASE.startsWith("/") && status === 500) {
    return new Error(
      "Backend service is unavailable. Start backend on port 8000 and retry."
    );
  }

  return new Error(statusText || "Request failed");
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const formData = new URLSearchParams();
    formData.append('username', email); // Backend expects username param but treats it as email
    formData.append('password', password);

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw mapAuthHttpError(response.status, `Login failed: ${response.statusText}`, data?.detail);
    }
    return response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw toNetworkAuthError();
    }
    throw err;
  }
}

export async function loginWithGoogle(idToken: string, missionRole: MissionRole = "admin"): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id_token: idToken, mission_role: missionRole }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw mapAuthHttpError(response.status, "Google login failed", data?.detail);
    }
    return response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw toNetworkAuthError();
    }
    throw err;
  }
}

export async function getGoogleClientId(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/google/config`);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw mapAuthHttpError(response.status, "Google configuration unavailable", data?.detail);
    }

    const data = (await response.json()) as GoogleAuthConfigResponse;
    const clientId = typeof data.client_id === "string" ? data.client_id.trim() : "";
    return clientId || null;
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw toNetworkAuthError();
    }
    throw err;
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
  role: string = 'citizen'
): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw mapAuthHttpError(response.status, `Registration failed: ${response.statusText}`, data?.detail);
    }
    return response.json();
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw toNetworkAuthError();
    }
    throw err;
  }
}

export async function getSessionMe(token: string): Promise<SessionMe> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Session check failed: ${response.statusText}`);
  }

  return response.json();
}

export async function switchMissionRole(token: string, missionRole: MissionRole): Promise<{ access_token: string; token_type: string; mission_role: MissionRole; allowed_mission_roles: MissionRole[] }> {
  const response = await fetch(`${API_BASE}/auth/switch-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mission_role: missionRole }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Role switch failed');
  }

  return response.json();
}
