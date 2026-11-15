import { NextResponse, type NextRequest } from "next/server";
import { competitionApiFetch } from "../../../../lib/api";
import { REFRESH_COOKIE, SESSION_COOKIE, type AuthSession } from "../../../../lib/auth";
import { oidcEnabled } from "../../../../lib/session/core";

async function establishSession(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const meRes = await competitionApiFetch(`/identity/v1/me`, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  if (!meRes.ok) {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
  const session = (await meRes.json()) as AuthSession;

  const response = NextResponse.json(session);
  response.cookies.set(SESSION_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

/** The app's own accounts (local development without Authentik only). */
export async function POST(req: NextRequest) {
  if (oidcEnabled())
    return NextResponse.json({ error: "Sign up with Enigmic accounts" }, { status: 404 });
  const body = (await req.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  const res = await competitionApiFetch(`/identity/v1/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return new NextResponse(text, { status: res.status });
  }

  const tokens = JSON.parse(text) as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };

  return establishSession(tokens);
}
