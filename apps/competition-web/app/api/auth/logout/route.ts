import { NextResponse, type NextRequest } from "next/server";
import { competitionApiFetch } from "../../../../lib/api";
import { REFRESH_COOKIE, SESSION_COOKIE } from "../../../../lib/auth";
import { authentikOrigin, buildSignOutUrl, webOrigin } from "../../../../lib/oidc";
import { oidcEnabled } from "../../../../lib/session/core";
import {
  clearSession,
  hasSameOrigin,
  readStoredSession,
} from "../../../../lib/session/server";

/**
 * Authentik: clears the session here and answers with where the browser goes
 * next (`redirect`): Authentik's end-session (signs out there too, then back to
 * the home page), or for `?then=delete-account` Authentik's account deletion.
 */
async function authentikSignOut(req: NextRequest) {
  if (!hasSameOrigin(req, webOrigin())) {
    return NextResponse.json(
      { error: "Sign-out must come from this site" },
      { status: 403 },
    );
  }
  const session = await readStoredSession();
  await clearSession();
  if (req.nextUrl.searchParams.get("then") === "delete-account") {
    // Signed out here first: if the account is deleted, nothing of it stays in
    // this browser; if not, signing in again is instant (Authentik session).
    return NextResponse.json({
      redirect: `${authentikOrigin()}/if/flow/enigmic-customer-unenrollment/?app=comp`,
    });
  }
  let redirect = "/";
  if (session) {
    try {
      redirect = (await buildSignOutUrl(session.idToken)).href;
    } catch (error) {
      console.error("[competition-web] Authentik end-session URL unavailable", error);
    }
  }
  return NextResponse.json({ redirect });
}

export async function POST(req: NextRequest) {
  if (oidcEnabled()) return authentikSignOut(req);
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await competitionApiFetch(`/identity/v1/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
