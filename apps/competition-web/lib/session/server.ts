import { cookies } from "next/headers";
import { needsRefresh, refreshSession } from "../oidc";
import {
  SESSION_COOKIE,
  openSession,
  sealSession,
  sessionCookieOptions,
  sessionMaxAgeSeconds,
  type CustomerSession,
} from "./core";

export function sessionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set (at least 32 characters)");
  }
  return secret;
}

export async function writeSession(
  session: CustomerSession,
  now = Date.now(),
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await sealSession(session, sessionSecret(), now), {
    ...sessionCookieOptions,
    maxAge: sessionMaxAgeSeconds(session, now),
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

/** The session as stored, without refreshing (sign-out). */
export async function readStoredSession(
  now = Date.now(),
): Promise<CustomerSession | null> {
  const store = await cookies();
  return openSession(store.get(SESSION_COOKIE)?.value, sessionSecret(), now);
}

/**
 * The signed-in session with a usable id_token: refreshed server-side when it's
 * about to expire. Null (and the cookie cleared) when there's none or Authentik
 * refuses the refresh (signed out there, account deleted, refresh expired).
 */
export async function currentSession(now = Date.now()): Promise<CustomerSession | null> {
  const session = await readStoredSession(now);
  if (!session) return null;
  if (!needsRefresh(session, now)) return session;
  try {
    const renewed = await refreshSession(session, now);
    await writeSession(renewed, now);
    return renewed;
  } catch (error) {
    console.warn(
      "[competition-web] session refresh refused",
      error instanceof Error ? error.message : error,
    );
    await clearSession();
    return null;
  }
}

/**
 * Changes must come from this site: browsers send Origin on cross-origin and on
 * same-origin non-GET requests.
 */
export function hasSameOrigin(request: Request, expected: string): boolean {
  const origin = request.headers.get("origin");
  if (origin) return origin === new URL(expected).origin;
  return request.headers.get("sec-fetch-site") === "same-origin";
}
