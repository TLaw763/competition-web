export const SESSION_COOKIE = "competition_session";
export const REFRESH_COOKIE = "competition_refresh";

export type AuthSession = {
  customerAccountId: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  platformAdmin?: boolean;
  /** `authentik` when signed in with Enigmic accounts (account actions live there). */
  provider?: "authentik" | "local";
};

/** Authentik pages reachable from this app (see lib/oidc.ts SCREENS). */
export type AccountScreen =
  "signin" | "signup" | "password" | "totp" | "webauthn" | "google";

/**
 * Starts sign-in (or an Authentik account page) and comes back to `next`.
 * `invitation`: the sign-up invitation that gets an invited person in while
 * sign-up is closed.
 */
export function signInHref(
  next?: string | null,
  screen: AccountScreen = "signin",
  { invitation }: { invitation?: string | null } = {},
): string {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (screen !== "signin") params.set("screen", screen);
  if (invitation) params.set("itoken", invitation);
  const qs = params.toString();
  return qs ? `/api/auth/login?${qs}` : "/api/auth/login";
}

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function loginWithPassword(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<AuthSession>;
}

export async function registerWithPassword(
  email: string,
  password: string,
  displayName: string,
) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<AuthSession>;
}

export async function loginWithGoogle(idToken: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ googleIdToken: idToken }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<AuthSession>;
}

/** Signs out; with Authentik, returns where the browser goes next (Authentik's end-session). */
export async function logoutSession(then?: "delete-account"): Promise<string | null> {
  const res = await fetch(then ? `/api/auth/logout?then=${then}` : "/api/auth/logout", {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  const body = (await res.json().catch(() => ({}))) as { redirect?: string };
  return body.redirect ?? null;
}

export async function fetchSession(): Promise<AuthSession | null> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<AuthSession>;
}
