import { EncryptJWT, jwtDecrypt } from "jose";

/**
 * Customer browser session with Authentik (D-053): tokens stay server-side in
 * an encrypted httpOnly cookie, like card-admin's. Pure and runtime-agnostic
 * (WebCrypto + jose), so the proxy and route handlers share it.
 */

export const SESSION_COOKIE = "__Host-competition_session";
export const OAUTH_COOKIE = "__Host-competition_oauth";

/** As long as Authentik's refresh token (30 days); the sign-in is never extended past it. */
export const ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const OAUTH_TTL_MS = 10 * 60 * 1000;

/** Browsers drop cookies over 4096 bytes; fail loudly instead. */
export const MAX_COOKIE_VALUE_BYTES = 3800;

export interface CustomerSession {
  /** Sent to competition-api as the bearer token (audience: this app). */
  idToken: string;
  refreshToken?: string;
  /** id_token `exp`, epoch seconds. */
  idTokenExpiresAt: number;
  /** Authentik user UUID: the customer account id. */
  subject: string;
  /** Epoch ms of sign-in; never extended. */
  createdAt: number;
}

export interface OAuthTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  nextPath: string;
  createdAt: number;
}

const KEY_CONTEXT = "enigmic-competition-web/session/v1";

async function deriveKey(secret: string): Promise<Uint8Array> {
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  const material = new TextEncoder().encode(`${KEY_CONTEXT}\0${secret}`);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", material));
}

async function seal(payload: Record<string, unknown>, secret: string, ttlMs: number) {
  const value = await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + ttlMs) / 1000))
    .encrypt(await deriveKey(secret));
  if (value.length > MAX_COOKIE_VALUE_BYTES) {
    throw new Error(
      `Sealed cookie is ${value.length} bytes (max ${MAX_COOKIE_VALUE_BYTES})`,
    );
  }
  return value;
}

async function unseal(
  value: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtDecrypt(value, await deriveKey(secret));
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function sealSession(session: CustomerSession, secret: string, now = Date.now()) {
  return seal(
    { ...session },
    secret,
    Math.max(1000, session.createdAt + ABSOLUTE_TTL_MS - now),
  );
}

export function sealOAuthTransaction(tx: OAuthTransaction, secret: string) {
  return seal({ ...tx }, secret, OAUTH_TTL_MS);
}

/** The session, or null when missing, tampered with or past the absolute limit. */
export async function openSession(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<CustomerSession | null> {
  if (!value) return null;
  const p = await unseal(value, secret);
  if (
    !p ||
    typeof p.idToken !== "string" ||
    typeof p.idTokenExpiresAt !== "number" ||
    typeof p.subject !== "string" ||
    typeof p.createdAt !== "number" ||
    now - p.createdAt >= ABSOLUTE_TTL_MS
  ) {
    return null;
  }
  return {
    idToken: p.idToken,
    refreshToken: typeof p.refreshToken === "string" ? p.refreshToken : undefined,
    idTokenExpiresAt: p.idTokenExpiresAt,
    subject: p.subject,
    createdAt: p.createdAt,
  };
}

export async function openOAuthTransaction(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<OAuthTransaction | null> {
  if (!value) return null;
  const p = await unseal(value, secret);
  if (
    !p ||
    typeof p.state !== "string" ||
    typeof p.nonce !== "string" ||
    typeof p.codeVerifier !== "string" ||
    typeof p.nextPath !== "string" ||
    typeof p.createdAt !== "number" ||
    now - p.createdAt > OAUTH_TTL_MS
  ) {
    return null;
  }
  return {
    state: p.state,
    nonce: p.nonce,
    codeVerifier: p.codeVerifier,
    nextPath: p.nextPath,
    createdAt: p.createdAt,
  };
}

/** Cookie lifetime left before the absolute limit, in seconds. */
export function sessionMaxAgeSeconds(session: CustomerSession, now = Date.now()): number {
  return Math.max(0, Math.floor((session.createdAt + ABSOLUTE_TTL_MS - now) / 1000));
}

/**
 * Lax, not Strict: customers arrive from links (emails, the card site), and
 * the OIDC callback is a cross-site navigation from Authentik. Changes are
 * protected by the same-origin check in the BFF instead.
 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
} as const;

export const oauthCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: OAUTH_TTL_MS / 1000,
} as const;

/** Only same-origin paths; anything else falls back to `fallback`. */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/my-fixtures",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return fallback;
  }
  if (
    value.startsWith("/api/") ||
    value.startsWith("/login") ||
    value.startsWith("/signup")
  ) {
    return fallback;
  }
  return value;
}

/** True when competition-web signs in through Authentik (AUTH_OIDC_ISSUER set). */
export function oidcEnabled(): boolean {
  return Boolean(process.env.AUTH_OIDC_ISSUER);
}
