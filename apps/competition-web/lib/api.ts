import { DEV_TOOLS } from "./dev-tools";

const API_BASE = process.env.COMPETITION_API_URL ?? "http://localhost:4000";

export function getApiBaseUrl() {
  return API_BASE.replace(/\/$/, "");
}

/**
 * Fetches competition-api from competition-web's server. When competition-api
 * sits behind Cloudflare Access (hosted), the service token goes along:
 * COMPETITION_API_ACCESS_CLIENT_ID / COMPETITION_API_ACCESS_CLIENT_SECRET.
 * Server-only: never call this from the browser.
 */
export function competitionApiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const clientId = process.env.COMPETITION_API_ACCESS_CLIENT_ID;
  const clientSecret = process.env.COMPETITION_API_ACCESS_CLIENT_SECRET;
  if (clientId && clientSecret) {
    headers.set("CF-Access-Client-Id", clientId);
    headers.set("CF-Access-Client-Secret", clientSecret);
  }
  return fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  if (init?.token) {
    headers.set("authorization", init.token);
  }
  const res = await competitionApiFetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * What a public page shows when apiFetch fails. The error carries the raw
 * response body (an HTML Cloudflare Access page, say), so it goes to the server
 * log and visitors get a short sentence; `pnpm dev` still shows the details.
 */
export function publicLoadError(what: string, e: unknown): string {
  console.error(`[competition-web] loading ${what} failed`, e);
  if (DEV_TOOLS && e instanceof Error) return e.message;
  return `Couldn't load ${what} right now. Try again in a few minutes`;
}
