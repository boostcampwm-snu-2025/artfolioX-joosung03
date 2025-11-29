// src/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface LocalUser {
  email: string;
}

interface AuthContextValue {
  user: LocalUser | null;
  loading: boolean;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = "artfoliox_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 새로고침해도 로그인 유지
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LocalUser;
        if (parsed?.email) {
          setUser({ email: parsed.email });
        }
      } catch {
        // 무시
      }
    }
    setLoading(false);
  }, []);

  function login(email: string) {
    const trimmed = email.trim();
    if (!trimmed) return;
    const u = { email: trimmed };
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(USER_KEY);
  }

  const value: AuthContextValue = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
