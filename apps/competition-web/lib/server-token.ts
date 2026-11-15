import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./auth";
import { oidcEnabled } from "./session/core";
import { readStoredSession } from "./session/server";

/**
 * The visitor's sign-in for server-rendered reads (`apiFetch(…, { token })`),
 * so pages show what they may see (their own private events). Read without
 * refreshing: a server page can't set cookies, and an expired token just
 * reads as signed out.
 */
export async function serverAuthToken(): Promise<string | null> {
  try {
    if (oidcEnabled()) {
      const session = await readStoredSession();
      return session ? `Bearer ${session.idToken}` : null;
    }
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    return token ? `Bearer ${token}` : null;
  } catch {
    return null;
  }
}
