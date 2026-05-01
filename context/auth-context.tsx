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
import { readJson, removeKey, writeJson } from "@/lib/storage";

const STORAGE_KEY = "sk:user:v1";

interface AuthContextValue {
  user: User | null;
  hydrated: boolean;
  login: (input: { email: string; name?: string }) => void;
  register: (input: { email: string; name: string; phone?: string }) => void;
  logout: () => void;
  setMember: (status: User["memberStatus"]) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(readJson<User>(STORAGE_KEY));
    setHydrated(true);
  }, []);

  const persist = (next: User | null) => {
    setUser(next);
    if (next) writeJson(STORAGE_KEY, next);
    else removeKey(STORAGE_KEY);
  };

  const login = useCallback<AuthContextValue["login"]>(({ email, name }) => {
    persist({
      email,
      name: name ?? email.split("@")[0],
      memberStatus: "guest",
    });
  }, []);

  const register = useCallback<AuthContextValue["register"]>(
    ({ email, name, phone }) => {
      persist({ email, name, phone, memberStatus: "guest" });
    },
    [],
  );

  const logout = useCallback(() => {
    persist(null);
  }, []);

  const setMember = useCallback<AuthContextValue["setMember"]>((status) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, memberStatus: status };
      writeJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, hydrated, login, register, logout, setMember }),
    [user, hydrated, login, register, logout, setMember],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      hydrated: false,
      login: () => {},
      register: () => {},
      logout: () => {},
      setMember: () => {},
    };
  }
  return ctx;
}
