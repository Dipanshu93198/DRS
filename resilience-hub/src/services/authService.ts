import { getApiBase } from '../lib/apiBase';

const API_BASE = getApiBase();

interface LoginResponse {
  access_token: string;
  token_type: string;
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
      try {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      } catch {
        throw new Error(`Login failed: ${response.statusText}`);
      }
    }
    return response.json();
  } catch (err: any) {
    if (err instanceof TypeError) {
      throw new Error(
        `Cannot connect to server at ${API_BASE}. ` +
        `Make sure the backend is running and the port is accessible from your browser. ` +
        `If you’re using Codespaces run \`python3 ../start-all.py\` or forward port 8000 in the Ports panel.`
      );
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
      try {
        const error = await response.json();
        throw new Error(error.detail || `Registration failed: ${response.statusText}`);
      } catch {
        throw new Error(`Registration failed: ${response.statusText}`);
      }
    }
    return response.json();
  } catch (err: any) {
    if (err instanceof TypeError) {
      throw new Error(
        `Cannot connect to server at ${API_BASE}. ` +
        `Make sure the backend is running and the port is accessible from your browser. ` +
        `If you’re using Codespaces run \`python3 ../start-all.py\` or forward port 8000 in the Ports panel.`
      );
    }
    throw err;
  }
}
