import { createContext, useContext, useState, ReactNode } from 'react';

export type MissionRole = 'admin' | 'field' | 'analyst';

interface OperatorProfile {
  name?: string;
  email?: string;
  missionRole?: MissionRole;
}

interface AuthContextValue {
  token: string | null;
  profile: OperatorProfile;
  login: (token: string, profile?: OperatorProfile) => void;
  logout: () => void;
  setMissionRole: (role: MissionRole) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [profile, setProfile] = useState<OperatorProfile>(() => {
    const saved = localStorage.getItem('operatorProfile');
    if (!saved) return { missionRole: 'admin' };
    try {
      const parsed = JSON.parse(saved) as OperatorProfile;
      return { missionRole: 'admin', ...parsed };
    } catch {
      return { missionRole: 'admin' };
    }
  });

  const login = (tok: string, nextProfile?: OperatorProfile) => {
    setToken(tok);
    localStorage.setItem('authToken', tok);
    if (nextProfile) {
      setProfile((prev) => {
        const merged = { ...prev, ...nextProfile };
        localStorage.setItem('operatorProfile', JSON.stringify(merged));
        return merged;
      });
    }
  };

  const setMissionRole = (role: MissionRole) => {
    const next = { ...profile, missionRole: role };
    setProfile(next);
    localStorage.setItem('operatorProfile', JSON.stringify(next));
  };

  const logout = () => {
    setToken(null);
    setProfile({ missionRole: 'admin' });
    localStorage.removeItem('authToken');
    localStorage.removeItem('operatorProfile');
  };

  return (
    <AuthContext.Provider value={{ token, profile, login, logout, setMissionRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
