"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/lib/api/types";

interface AuthContextValue {
  user: User | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (input: { email: string; password: string; name: string; phone?: string }) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // On mount, fetch current user from /api/customer/auth/me
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await fetch("/api/customer/auth/me", {
          credentials: "same-origin",
        });
        if (res.ok) {
          const { user: userData } = await res.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setHydrated(true);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/customer/auth/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          return { ok: true };
        }
        return { ok: false, message: data.message || "Login failed" };
      } catch {
        return { ok: false, message: "Network error" };
      }
    },
    [],
  );

  const register = useCallback(
    async (input: { email: string; password: string; name: string; phone?: string }) => {
      try {
        const res = await fetch("/api/customer/auth/register", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          return { ok: true };
        }
        return { ok: false, message: data.message || "Registration failed" };
      } catch {
        return { ok: false, message: "Network error" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/customer/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Ignore errors
    }
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/auth/me", {
        credentials: "same-origin",
      });
      if (res.ok) {
        const { user: userData } = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, hydrated, login, register, logout, refresh }),
    [user, hydrated, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      hydrated: false,
      login: async () => ({ ok: false, message: "No auth context" }),
      register: async () => ({ ok: false, message: "No auth context" }),
      logout: async () => {},
      refresh: async () => {},
    };
  }
  return ctx;
}
