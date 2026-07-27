import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { User } from "./types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("iot_token")) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => localStorage.removeItem("iot_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(identifier: string, password: string) {
    const result = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    });
    localStorage.setItem("iot_token", result.token);
    setUser(result.user);
  }

  function logout() {
    localStorage.removeItem("iot_token");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, setCurrentUser: setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
}
