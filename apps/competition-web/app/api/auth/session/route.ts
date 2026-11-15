import { NextResponse, type NextRequest } from "next/server";
import { competitionApiFetch } from "../../../../lib/api";
import { REFRESH_COOKIE, SESSION_COOKIE, type AuthSession } from "../../../../lib/auth";
import { oidcEnabled } from "../../../../lib/session/core";
import { clearSession, currentSession } from "../../../../lib/session/server";

export const dynamic = "force-dynamic";

/** The signed-in account from competition-api, with its roles. */
async function authentikSession() {
  const session = await currentSession();
  if (!session) return NextResponse.json(null, { status: 401 });
  const meRes = await competitionApiFetch(`/v1/me`, {
    headers: { authorization: `Bearer ${session.idToken}` },
    cache: "no-store",
  });
  if (meRes.status === 401) {
    await clearSession();
    return NextResponse.json(null, { status: 401 });
  }
  if (!meRes.ok) return NextResponse.json(null, { status: 502 });
  const me = (await meRes.json()) as AuthSession;
  return NextResponse.json({ ...me, provider: "authentik" } satisfies AuthSession);
}

export async function GET(req: NextRequest) {
  if (oidcEnabled()) return authentikSession();
  let accessToken = req.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (!accessToken && refreshToken) {
    const refreshRes = await competitionApiFetch(`/identity/v1/token/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (refreshRes.ok) {
      const tokens = await refreshRes.json();
      accessToken = tokens.accessToken as string;
    }
  }

  if (!accessToken) {
    return NextResponse.json(null, { status: 401 });
  }

  const meRes = await competitionApiFetch(`/identity/v1/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!meRes.ok) {
    return NextResponse.json(null, { status: 401 });
  }

  const session = (await meRes.json()) as AuthSession;
  const response = NextResponse.json(session);
  if (accessToken !== req.cookies.get(SESSION_COOKIE)?.value) {
    response.cookies.set(SESSION_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600,
    });
  }
  return response;
}
