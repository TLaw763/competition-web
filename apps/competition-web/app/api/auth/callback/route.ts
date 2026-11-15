import { cookies } from "next/headers";
import { completeSignIn, isRestartedState } from "../../../../lib/oidc";
import {
  OAUTH_COOKIE,
  oauthCookieOptions,
  openOAuthTransaction,
} from "../../../../lib/session/core";
import { sessionSecret, writeSession } from "../../../../lib/session/server";

export const dynamic = "force-dynamic";

function redirect(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: { location, "cache-control": "no-store" },
  });
}

/** Back from Authentik: exchange the code, store the session, go where sign-in started. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const store = await cookies();
  const transaction = await openOAuthTransaction(
    store.get(OAUTH_COOKIE)?.value,
    sessionSecret(),
  );
  store.set(OAUTH_COOKIE, "", { ...oauthCookieOptions, maxAge: 0 });

  const idpError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (idpError) {
    return redirect(`/login-failed?error=${encodeURIComponent(idpError)}`);
  }
  if (!transaction) {
    // No sign-in started in this browser: typically the sign-up or reset email
    // opened on another device, which Authentik sends back here. Authentik has
    // the session by now, so starting sign-in again is instant. Once only: a
    // second miss means this browser doesn't keep the sign-in cookie.
    if (isRestartedState(url.searchParams.get("state"))) {
      return redirect(
        "/login-failed?error=" +
          encodeURIComponent(
            "Sign-in needs cookies for comp.enigmic.co.za. Allow them and try again.",
          ),
      );
    }
    return redirect("/api/auth/login?restarted=1");
  }

  try {
    await writeSession(await completeSignIn(url.search, transaction));
    return redirect(transaction.nextPath);
  } catch (error) {
    console.error("[competition-web] OIDC callback failed", error);
    return redirect(
      "/login-failed?error=" + encodeURIComponent("Sign-in failed. Try again."),
    );
  }
}
