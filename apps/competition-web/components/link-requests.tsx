"use client";

import { buttonVariants } from "./ui/button";
import { cn } from "@enigmic-co/ui/cn";

import { useEffect, useState } from "react";
import { bffFetch, errorMessage } from "../lib/bff-client";
import { useAuth } from "./auth-provider";

type LinkRequest = {
  id: string;
  groupName: string;
  playerName: string;
  onlineClientUsername: string | null;
  events: string[];
  requestedBy: string | null;
  createdAt: string;
};

/**
 * An organiser asked whether the signed-in account is one of their roster
 * players (e.g. imported from md-league). Accepting links that player, in
 * every event of the group, to this account. Renders nothing without requests.
 */
export function LinkRequestsPanel() {
  const { session } = useAuth();
  const [items, setItems] = useState<LinkRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void bffFetch<{ items: LinkRequest[] }>("/v1/me/link-requests")
      .then((res) => !cancelled && setItems(res.items))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session || items.length === 0) return null;

  async function answer(request: LinkRequest, choice: "accept" | "decline") {
    setBusy(true);
    setError(null);
    try {
      await bffFetch(`/v1/me/link-requests/${request.id}/${choice}`, {
        method: "POST",
        body: "{}",
      });
      if (choice === "accept") {
        // Now a player: /account opens their player page's Account tab.
        window.location.assign("/account");
        return;
      }
      setItems((list) => list.filter((r) => r.id !== request.id));
    } catch (e) {
      setError(errorMessage(e, "Couldn't answer the request"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-xs",
        "space-y-3 p-5 text-sm",
      )}
      aria-labelledby="link-requests"
    >
      <div>
        <h2 id="link-requests" className="text-lg font-semibold text-foreground">
          Is this you?
        </h2>
        <p className="text-muted-foreground">
          An organiser thinks you play as one of their players. Accept to see your
          fixtures and enter your results; the player keeps their name, Master Duel
          username and results.
        </p>
      </div>
      {error ? (
        <p
          className="rounded-md border border-danger/35 bg-danger-soft p-3 text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map((request) => (
          <li key={request.id} className="rounded-lg border border-border p-3">
            <p className="font-medium text-foreground">
              {request.playerName}
              {request.onlineClientUsername ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {request.onlineClientUsername}
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground">
              {request.groupName}
              {request.events.length > 0 ? `: ${request.events.join(", ")}` : ""}
              {request.requestedBy ? ` · asked by ${request.requestedBy}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonVariants()}
                disabled={busy}
                onClick={() => void answer(request, "accept")}
              >
                Yes, that&apos;s me
              </button>
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                disabled={busy}
                onClick={() => void answer(request, "decline")}
              >
                Not me
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
