import * as client from "openid-client";
import type { CustomerSession, OAuthTransaction } from "./session/core";

/** Registered on the Authentik provider (ygo-enigmic infra/authentik/enigmic-customer-blueprint.yaml). */
export const CALLBACK_PATH = "/api/auth/callback";

/** Registered as the provider's logout redirect URI (strict match). */
export const POST_LOGOUT_PATH = "/";

/**
 * Authentik pages a customer can open from this app, each coming back through
 * the app's sign-in (Authentik only accepts a path on itself as `next`). See
 * ygo-enigmic infra/authentik/README.md, "Customers are external".
 */
export const SCREENS = {
  signin: null,
  signup: "/if/flow/enigmic-customer-enrollment/",
  password: "/if/flow/enigmic-customer-password-change/",
  totp: "/if/flow/default-authenticator-totp-setup/",
  webauthn: "/if/flow/default-authenticator-webauthn-setup/",
  google: "/source/oauth/login/google-customer/",
} as const;
export type Screen = keyof typeof SCREENS;

export function isScreen(value: string | null | undefined): value is Screen {
  return Boolean(value && Object.prototype.hasOwnProperty.call(SCREENS, value));
}

export function webOrigin(): string {
  return (process.env.WEB_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

function issuer(): URL {
  const value = process.env.AUTH_OIDC_ISSUER;
  if (!value) throw new Error("AUTH_OIDC_ISSUER is required");
  return new URL(value);
}

/** Authentik's own address, for its account pages. */
export function authentikOrigin(): string {
  return issuer().origin;
}

let configuration: Promise<client.Configuration> | null = null;

function oidcConfiguration(): Promise<client.Configuration> {
  if (!configuration) {
    const clientId = process.env.AUTH_OIDC_CLIENT_ID;
    const clientSecret = process.env.AUTH_OIDC_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("AUTH_OIDC_CLIENT_ID and AUTH_OIDC_CLIENT_SECRET are required");
    }
    const url = issuer();
    // Plain http only for a local Authentik (the ygo-enigmic local-test stack).
    const local =
      url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    configuration = client
      .discovery(
        url,
        clientId,
        clientSecret,
        undefined,
        local ? { execute: [client.allowInsecureRequests] } : undefined,
      )
      .catch((error) => {
        configuration = null;
        throw error;
      });
  }
  return configuration;
}

function redirectUri(): string {
  return `${webOrigin()}${CALLBACK_PATH}`;
}

/**
 * Where to send the browser: Authentik's authorize URL, or one of its pages
 * with that URL as `next` (relative, the only kind Authentik accepts).
 */
/** Marks the `state` of a sign-in restarted by the callback (see isRestartedState). */
const RESTARTED = ".restarted";

/** The callback restarted this sign-in once already: don't loop (cookies blocked). */
export function isRestartedState(state: string | null): boolean {
  return Boolean(state?.endsWith(RESTARTED));
}

/** An Authentik sign-up invitation id (`itoken`, invite-only sign-up). */
export function isInvitationToken(value: string | null | undefined): value is string {
  return Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  );
}

export async function beginSignIn(
  nextPath: string,
  screen: Screen = "signin",
  { restarted = false, invitation }: { restarted?: boolean; invitation?: string } = {},
): Promise<{ url: URL; transaction: OAuthTransaction }> {
  const config = await oidcConfiguration();
  const codeVerifier = client.randomPKCECodeVerifier();
  const transaction: OAuthTransaction = {
    state: client.randomState() + (restarted ? RESTARTED : ""),
    nonce: client.randomNonce(),
    codeVerifier,
    nextPath,
    createdAt: Date.now(),
  };
  const authorize = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(),
    scope: "openid email profile offline_access",
    code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: "S256",
    state: transaction.state,
    nonce: transaction.nonce,
  });
  const page = SCREENS[screen];
  if (!page) return { url: authorize, transaction };
  const url = new URL(page, authorize.origin);
  url.searchParams.set("next", authorize.pathname + authorize.search);
  // While sign-up is closed, an invited person signs up with their invitation.
  if (screen === "signup" && isInvitationToken(invitation))
    url.searchParams.set("itoken", invitation);
  return { url, transaction };
}

function sessionFromTokens(
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
  now: number,
  previous?: CustomerSession,
): CustomerSession {
  const claims = tokens.claims();
  if (!tokens.id_token || !claims) throw new Error("Token response has no id_token");
  if (previous && claims.sub !== previous.subject) {
    throw new Error("Refreshed id_token subject changed");
  }
  return {
    idToken: tokens.id_token,
    refreshToken: tokens.refresh_token ?? previous?.refreshToken,
    idTokenExpiresAt: claims.exp,
    subject: claims.sub,
    createdAt: previous?.createdAt ?? now,
  };
}

/** Exchanges the code (PKCE, state and nonce checked). */
export async function completeSignIn(
  callbackSearch: string,
  transaction: OAuthTransaction,
  now = Date.now(),
): Promise<CustomerSession> {
  const config = await oidcConfiguration();
  const tokens = await client.authorizationCodeGrant(
    config,
    new URL(`${redirectUri()}${callbackSearch}`),
    {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true,
    },
  );
  return sessionFromTokens(tokens, now);
}

/** Renew this long before the id_token expires. */
const REFRESH_MARGIN_S = 60;

export function needsRefresh(session: CustomerSession, now = Date.now()): boolean {
  return session.idTokenExpiresAt - REFRESH_MARGIN_S <= Math.floor(now / 1000);
}

export async function refreshSession(
  session: CustomerSession,
  now = Date.now(),
): Promise<CustomerSession> {
  if (!session.refreshToken) throw new Error("Session has no refresh token");
  const config = await oidcConfiguration();
  return sessionFromTokens(
    await client.refreshTokenGrant(config, session.refreshToken),
    now,
    session,
  );
}

/** RP-initiated logout: ends the Authentik session too, then back to the home page. */
export async function buildSignOutUrl(idToken: string): Promise<URL> {
  return client.buildEndSessionUrl(await oidcConfiguration(), {
    id_token_hint: idToken,
    post_logout_redirect_uri: `${webOrigin()}${POST_LOGOUT_PATH}`,
  });
}
