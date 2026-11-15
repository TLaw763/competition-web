"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fetchSession,
  loginWithGoogle,
  loginWithPassword,
  logoutSession,
  registerWithPassword,
  type AuthSession,
} from "../lib/auth";

type AuthContextValue = {
  session: AuthSession | null;
  /** How this site signs in: Enigmic accounts (Authentik) or local dev accounts. */
  provider: "authentik" | "local";
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginGoogleDev: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Authentik only: signs out here, then opens Authentik's account deletion. */
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  provider = "local",
}: {
  children: React.ReactNode;
  provider?: "authentik" | "local";
}) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSession(await fetchSession());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      provider,
      loading,
      refresh,
      async login(email, password) {
        const next = await loginWithPassword(email, password);
        setSession(next);
      },
      async register(email, password, displayName) {
        const next = await registerWithPassword(email, password, displayName);
        setSession(next);
      },
      async loginGoogleDev(email) {
        const next = await loginWithGoogle(`google-dev:${email}`);
        setSession(next);
      },
      async logout() {
        const redirect = await logoutSession();
        setSession(null);
        window.location.assign(redirect ?? "/");
      },
      async deleteAccount() {
        const redirect = await logoutSession("delete-account");
        setSession(null);
        if (redirect) window.location.assign(redirect);
      },
    }),
    [session, provider, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
