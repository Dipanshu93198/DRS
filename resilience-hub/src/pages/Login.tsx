import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGoogleClientId, login as loginApi, loginWithGoogle, register as registerApi } from '@/services/authService';
import { type MissionRole, useAuth } from '@/hooks/useAuth';

const GOOGLE_GSI_SCRIPT_ID = 'google-gsi-client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }
  return fallback;
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('citizen');
  const [missionRole, setMissionRole] = useState<MissionRole>('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const envGoogleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  const [googleClientId, setGoogleClientId] = useState(envGoogleClientId || '');
  const [googleConfigLoading, setGoogleConfigLoading] = useState(!envGoogleClientId);
  const showMockGoogleLogin = import.meta.env.DEV;

  useEffect(() => {
    let active = true;

    if (envGoogleClientId) {
      setGoogleClientId(envGoogleClientId);
      setGoogleError('');
      setGoogleConfigLoading(false);
      return () => {
        active = false;
      };
    }

    setGoogleConfigLoading(true);
    getGoogleClientId()
      .then((clientId) => {
        if (!active) return;
        setGoogleClientId(clientId || '');
        setGoogleError('');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setGoogleError(getErrorMessage(err, 'Unable to load Google sign-in configuration from backend.'));
      })
      .finally(() => {
        if (!active) return;
        setGoogleConfigLoading(false);
      });

    return () => {
      active = false;
    };
  }, [envGoogleClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await registerApi(name, email, password, role);
        const res = await loginApi(email, password);
        login(res.access_token, { name, email, missionRole: res.user?.mission_role || missionRole });
        navigate('/dashboard');
      } else {
        const res = await loginApi(email, password);
        login(res.access_token, { email, missionRole: res.user?.mission_role || missionRole });
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, isRegister ? 'Registration failed' : 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || isRegister) return;

    const handleGoogleCredential = async ({ credential }: { credential: string }) => {
      try {
        setGoogleLoading(true);
        setError('');
        const res = await loginWithGoogle(credential, missionRole);
        login(res.access_token, {
          email: res.user?.email,
          name: res.user?.name,
          missionRole: res.user?.mission_role || missionRole,
        });
        navigate('/dashboard');
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Google sign-in failed'));
      } finally {
        setGoogleLoading(false);
      }
    };

    const renderGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      googleBtnRef.current.innerHTML = '';
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: '340',
        });
        setGoogleError('');
      } catch {
        setGoogleError('Google Sign-In blocked or invalid for this origin. Check Google Console authorized origins.');
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogle();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_GSI_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', renderGoogle, { once: true });
      return () => {
        existingScript.removeEventListener('load', renderGoogle);
      };
    }

    const script = document.createElement('script');
    script.id = GOOGLE_GSI_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogle;
    script.onerror = () => setGoogleError('Google script failed to load. Disable blocker/VPN and allow accounts.google.com.');
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, isRegister, login, missionRole, navigate]);

  const handleMockGoogleLogin = async () => {
    if (isRegister) return;
    try {
      setGoogleLoading(true);
      setError('');
      const res = await loginWithGoogle('mock_google_token_for_testing', missionRole);
      login(res.access_token, {
        email: res.user?.email,
        name: res.user?.name,
        missionRole: res.user?.mission_role || missionRole,
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Mock Google sign-in failed'));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(15, 23, 42, 0.8) 0%, rgba(2, 6, 23, 1) 100%)'
      }}
    >
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 204, 255, 0.1) 25%, rgba(0, 204, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 204, 255, 0.1) 75%, rgba(0, 204, 255, 0.1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 204, 255, 0.1) 25%, rgba(0, 204, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 204, 255, 0.1) 75%, rgba(0, 204, 255, 0.1) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-96 h-96 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(0, 204, 255, 0.4) 0%, transparent 70%)',
          filter: 'blur(40px)'
        }}
      ></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-between items-center mb-8 px-4">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-cyan-400">SYSTEM OPERATIONAL</span>
          </div>
          <div className="text-xs text-cyan-400 font-mono">
            {new Date().toLocaleString()}
          </div>
        </div>

        <div className="border border-cyan-600 bg-slate-900 bg-opacity-80 backdrop-blur-sm rounded-lg p-8 shadow-2xl relative"
          style={{
            boxShadow: '0 0 20px rgba(0, 204, 255, 0.3), inset 0 0 20px rgba(0, 204, 255, 0.05)'
          }}
        >
          <div className="absolute -top-3 left-6 bg-slate-950 px-3 py-1 border border-cyan-500 rounded text-cyan-400 text-xs font-mono flex items-center space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
            <span>{isRegister ? 'NEW OPERATOR' : 'OPERATOR LOGIN'}</span>
          </div>

          <h1 className="text-3xl font-bold text-white font-mono mb-2 mt-4">
            {isRegister ? 'CREATE' : 'ACCESS'}
            <br />
            <span className="text-cyan-400">CREDENTIALS</span>
          </h1>
          <p className="text-cyan-300 text-xs font-mono mb-6">
            Emergency Response Network Alpha
          </p>

          {error && (
            <div className="bg-red-950 border border-red-500 rounded px-3 py-2 mb-4 text-red-300 text-xs font-mono">
              Warning: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-cyan-400 text-xs font-mono mb-2">FULL NAME</label>
                <input
                  type="text"
                  placeholder="Enter full name..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-cyan-500 rounded text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-300 focus:bg-slate-700 transition"
                  required={isRegister}
                />
              </div>
            )}

            <div>
              <label className="block text-cyan-400 text-xs font-mono mb-2">EMAIL ADDRESS</label>
              <input
                type="email"
                placeholder="operator@emergency.net"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-cyan-500 rounded text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-300 focus:bg-slate-700 transition"
                required
              />
            </div>

            <div>
              <label className="block text-cyan-400 text-xs font-mono mb-2">PASSWORD</label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-cyan-500 rounded text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-300 focus:bg-slate-700 transition"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-cyan-400 text-xs font-mono mb-2">OPERATOR ROLE</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-cyan-500 rounded text-white font-mono text-sm focus:outline-none focus:border-cyan-300 focus:bg-slate-700 transition"
                >
                  <option value="citizen">Citizen Portal</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="government">Official</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-cyan-400 text-xs font-mono mb-2">MISSION PROFILE</label>
              <select
                value={missionRole}
                onChange={e => setMissionRole(e.target.value as MissionRole)}
                className="w-full px-4 py-2 bg-slate-800 border border-cyan-500 rounded text-white font-mono text-sm focus:outline-none focus:border-cyan-300 focus:bg-slate-700 transition"
              >
                <option value="admin">Command Admin</option>
                <option value="field">Field Officer</option>
                <option value="analyst">Intel Analyst</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-6 bg-slate-900 border-2 border-cyan-500 text-cyan-300 font-mono font-bold rounded uppercase text-sm tracking-wider hover:bg-cyan-900 hover:text-cyan-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                textShadow: '0 0 10px rgba(0, 204, 255, 0.5)'
              }}
            >
              {loading ? 'INITIALIZING...' : (isRegister ? 'REGISTER' : 'ACCESS')}
            </button>

            {!isRegister && (
              <div className="pt-2">
                <p className="text-[10px] font-mono text-cyan-300/70 mb-2">OR AUTHENTICATE VIA GOOGLE</p>
                {googleConfigLoading ? (
                  <div className="w-full rounded border border-cyan-700/50 bg-slate-900/70 px-3 py-2 text-xs font-mono text-cyan-300">
                    Checking Google sign-in configuration...
                  </div>
                ) : googleClientId ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-center">
                      <div ref={googleBtnRef} />
                    </div>
                    {showMockGoogleLogin && (
                      <button
                        type="button"
                        onClick={handleMockGoogleLogin}
                        disabled={googleLoading}
                        className="w-full py-2 bg-slate-800 border border-cyan-700/50 text-cyan-300 font-mono font-bold rounded uppercase text-[11px] tracking-wider transition hover:bg-cyan-900/30 disabled:opacity-50"
                      >
                        Use Local Mock Google Login
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="w-full rounded border border-amber-500/50 bg-amber-950/30 px-3 py-2 text-xs font-mono text-amber-300">
                      Google sign-in setup missing. Add <code>GOOGLE_CLIENT_ID</code> in <code>backend/.env</code> or <code>VITE_GOOGLE_CLIENT_ID</code> in <code>resilience-hub/.env</code>, then restart the servers.
                    </div>
                    <button
                      type="button"
                      onClick={handleMockGoogleLogin}
                      disabled={googleLoading}
                      className="w-full py-2 bg-slate-800 border-2 border-amber-500/50 text-amber-400 font-mono font-bold rounded uppercase text-xs tracking-wider transition hover:bg-amber-900/40 disabled:opacity-50"
                    >
                      Bypass / Mock Google Login
                    </button>
                  </div>
                )}
                {googleLoading && (
                  <p className="text-center text-xs font-mono text-cyan-300 mt-2">VERIFYING GOOGLE TOKEN...</p>
                )}
                {googleError && (
                  <p className="text-center text-xs font-mono text-amber-300 mt-2">{googleError}</p>
                )}
              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-cyan-500 border-opacity-30 text-center">
            <p className="text-slate-400 text-xs font-mono mb-3">
              {isRegister ? 'EXISTING OPERATOR?' : 'NEW TO SYSTEM?'}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-cyan-400 hover:text-cyan-200 font-mono font-bold text-xs uppercase tracking-wider transition hover:underline"
            >
              {isRegister ? '[ SIGN IN ]' : '[ CREATE ACCOUNT ]'}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 px-4 text-xs font-mono text-slate-500">
          <div>STATUS: <span className="text-green-400">ONLINE</span></div>
          <div>COMMS: <span className="text-green-400">ACTIVE</span></div>
          <div>POWER: <span className="text-green-400">NORMAL</span></div>
        </div>
      </div>
    </div>
  );
}
