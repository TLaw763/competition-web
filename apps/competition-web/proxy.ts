import { NextResponse, type NextRequest } from "next/server";

/**
 * With Enigmic accounts (Authentik, D-053), the app has no sign-in or sign-up
 * forms of its own: /login and /signup go to Authentik and come back to `next`.
 * Without AUTH_OIDC_ISSUER (local development) the local forms stay.
 */
export function proxy(req: NextRequest) {
  if (!process.env.AUTH_OIDC_ISSUER) return NextResponse.next();
  const target = new URL("/api/auth/login", req.nextUrl.origin);
  const next = req.nextUrl.searchParams.get("next");
  if (next) target.searchParams.set("next", next);
  if (req.nextUrl.pathname === "/signup") target.searchParams.set("screen", "signup");
  return NextResponse.redirect(target, 307);
}

export const config = { matcher: ["/login", "/signup"] };
