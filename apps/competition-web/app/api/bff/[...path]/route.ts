import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { competitionApiFetch } from "../../../../lib/api";
import { SESSION_COOKIE } from "../../../../lib/auth";
import { webOrigin } from "../../../../lib/oidc";
import { oidcEnabled } from "../../../../lib/session/core";
import { currentSession, hasSameOrigin } from "../../../../lib/session/server";

const NULL_BODY_STATUSES = new Set([204, 205, 304]);

async function proxy(req: NextRequest, path: string) {
  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (oidcEnabled()) {
    // The session cookie is SameSite=Lax: changes must come from this site.
    if (
      req.method !== "GET" &&
      req.method !== "HEAD" &&
      !hasSameOrigin(req, webOrigin())
    ) {
      return Response.json(
        { title: "Forbidden", detail: "Changes must come from this site" },
        { status: 403 },
      );
    }
    // Only the session's token: a browser can't pass its own.
    const session = await currentSession();
    if (session) headers.set("authorization", `Bearer ${session.idToken}`);
  } else if (auth) {
    headers.set("authorization", auth);
  } else {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (session) headers.set("authorization", `Bearer ${session}`);
  }
  const idempotency = req.headers.get("idempotency-key");
  if (idempotency) headers.set("idempotency-key", idempotency);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.text();
    // An empty JSON body is refused by competition-api (e.g. a bare DELETE).
    if (body) {
      init.body = body;
      headers.set("content-type", "application/json");
    }
  }

  const res = await competitionApiFetch(`${path}${req.nextUrl.search}`, init);
  // 204/205/304 can't carry a body: `new Response("", { status: 204 })` throws,
  // which turned a successful delete into a 500.
  if (NULL_BODY_STATUSES.has(res.status)) {
    return new Response(null, { status: res.status });
  }
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest) {
  return proxy(req, req.nextUrl.pathname.replace(/^\/api\/bff/, ""));
}

export async function POST(req: NextRequest) {
  return proxy(req, req.nextUrl.pathname.replace(/^\/api\/bff/, ""));
}

export async function PATCH(req: NextRequest) {
  return proxy(req, req.nextUrl.pathname.replace(/^\/api\/bff/, ""));
}

export async function PUT(req: NextRequest) {
  return proxy(req, req.nextUrl.pathname.replace(/^\/api\/bff/, ""));
}

export async function DELETE(req: NextRequest) {
  return proxy(req, req.nextUrl.pathname.replace(/^\/api\/bff/, ""));
}
