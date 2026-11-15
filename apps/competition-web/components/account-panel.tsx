"use client";

import { buttonVariants } from "./ui/button";
import { cn } from "@enigmic-co/ui/cn";

import { useEffect, useState } from "react";
import { signInHref } from "../lib/auth";
import { bffFetch, errorMessage } from "../lib/bff-client";
import { useAuth } from "./auth-provider";
import { AvailabilityEditor } from "./availability-editor";
import { CalendarFeedPanel } from "./calendar-feed";
import { LinkRequestsPanel } from "./link-requests";
import { PlayerDetailsPanel } from "./player-details";

type Consent = {
  publicDisplayName: boolean;
  onlineClientUsername: boolean;
  decklists: boolean;
};

/**
 * Everything the signed-in player manages about themselves: the Account tab
 * of their player page, or /account when they have no player records yet.
 * `returnTo`: where the Enigmic account pages come back to.
 */
export function AccountPanel({ returnTo = "/account" }: { returnTo?: string }) {
  const { session, logout, deleteAccount } = useAuth();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportJson, setExportJson] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void bffFetch<Consent>("/v1/me/consent")
      .then(setConsent)
      .catch((e) => setError(errorMessage(e, "Failed to load consent")));
  }, [session]);

  if (!session) return null;

  async function saveConsent() {
    if (!consent) return;
    setError(null);
    try {
      await bffFetch("/v1/me/consent", {
        method: "PATCH",
        body: JSON.stringify(consent),
      });
      setMessage("Consent preferences saved.");
    } catch (e) {
      setError(errorMessage(e, "Failed to save consent"));
    }
  }

  async function exportAccount() {
    setError(null);
    try {
      const res = await fetch("/api/bff/identity/v1/me/export");
      setExportJson(await res.text());
    } catch (e) {
      setError(errorMessage(e, "Export failed"));
    }
  }

  return (
    <div className="space-y-6">
      <LinkRequestsPanel />
      <PlayerDetailsPanel />

      <section
        className={cn(
          "rounded-xl border bg-card text-card-foreground shadow-xs",
          "space-y-3 p-5 text-sm",
        )}
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sign-in</h2>
          <p className="text-muted-foreground">{session.email}</p>
        </div>
        <p>
          <span className="text-muted-foreground">Email verified:</span>{" "}
          {session.emailVerified ? "Yes" : "No"}
        </p>
        {session.provider === "authentik" ? (
          <EnigmicAccount returnTo={returnTo} onDelete={deleteAccount} />
        ) : null}
      </section>

      <AvailabilityEditor />

      <CalendarFeedPanel />

      {consent ? (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Public display consent
          </h2>
          {(
            [
              ["publicDisplayName", "Show my display name on public standings"],
              ["onlineClientUsername", "Show my Master Duel username publicly"],
              ["decklists", "Show decklists after match finalization"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={consent[key]}
                onChange={(e) => setConsent({ ...consent, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
          <button
            type="button"
            className={buttonVariants()}
            onClick={() => void saveConsent()}
          >
            Save consent
          </button>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {session.provider !== "authentik" ? (
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            onClick={() => void exportAccount()}
          >
            Export account data
          </button>
        ) : null}
        <button
          type="button"
          className={buttonVariants({ variant: "destructive" })}
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
            "text-sm",
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className={cn(
            "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
            "text-sm",
          )}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {exportJson ? (
        <pre
          className={cn(
            "rounded-xl border bg-card text-card-foreground shadow-xs",
            "overflow-x-auto p-4 text-xs text-muted-foreground",
          )}
        >
          {exportJson}
        </pre>
      ) : null}
    </div>
  );
}

/**
 * The Enigmic account (Authentik, D-053) is shared by every Enigmic app; its
 * pages open on account.enigmic.co.za and come back here.
 */
function EnigmicAccount({
  returnTo,
  onDelete,
}: {
  returnTo: string;
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const links = [
    ["password", "Change password"],
    ["totp", "Set up an authenticator app"],
    ["webauthn", "Add a security key or passkey"],
    ["google", "Link your Google account"],
  ] as const;
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div>
        <h3 className="font-semibold text-foreground">Enigmic account</h3>
        <p className="text-muted-foreground">
          You sign in to every Enigmic app with this account. These open on
          account.enigmic.co.za and bring you back here.
        </p>
      </div>
      <ul className="space-y-1">
        {links.map(([screen, label]) => (
          <li key={screen}>
            <a href={signInHref(returnTo, screen)}>{label}</a>
          </li>
        ))}
      </ul>
      {confirming ? (
        <div
          className="rounded-md border border-danger/35 bg-danger-soft p-3 text-danger space-y-2"
          role="alert"
        >
          <p>
            Deleting your Enigmic account removes it for every Enigmic app. You&apos;ll be
            signed out here, then asked to type DELETE to confirm.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => void onDelete()}
            >
              Continue to delete
            </button>
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() => setConfirming(false)}
            >
              Keep my account
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={buttonVariants({ variant: "outline", className: "text-sm" })}
          onClick={() => setConfirming(true)}
        >
          Delete my Enigmic account…
        </button>
      )}
    </div>
  );
}
