"use client";

import { buttonVariants } from "./ui/button";

import { useCallback, useEffect, useState } from "react";
import { signInHref } from "../lib/auth";
import { bffFetch, errorMessage, formatDateTime } from "../lib/bff-client";
import type { JoinRequestRow, RegistrationView } from "../lib/types";
import { useAuth } from "./auth-provider";
import { useToast } from "./toast";

const CLOSED_REASON: Record<NonNullable<RegistrationView["closedReason"]>, string> = {
  closed: "Registration is closed.",
  not_public: "Only public events take registrations.",
  no_start_date: "Set the event's start date first: registration closes then.",
  started: "The event has started, so registration is closed.",
  finished: "The event has finished.",
};

function useRegistration(seasonId: string, signedIn: boolean) {
  const [view, setView] = useState<RegistrationView | null>(null);
  const load = useCallback(async () => {
    try {
      setView(await bffFetch<RegistrationView>(`/v1/seasons/${seasonId}/registration`));
    } catch {
      setView(null);
    }
  }, [seasonId]);
  useEffect(() => {
    void load();
  }, [load, signedIn]);
  return { view, load };
}

/**
 * Event page: request to join an upcoming public event while registration is
 * open (organisers decide), and "Add myself" for the group's organisers.
 * Renders nothing when neither applies.
 */
export function EventRegistration({
  seasonId,
  seasonName,
  timezone,
  returnTo,
  onJoined,
}: {
  seasonId: string;
  seasonName: string;
  timezone: string;
  returnTo: string;
  onJoined: () => Promise<void> | void;
}) {
  const { session } = useAuth();
  const toast = useToast();
  const { view, load } = useRegistration(seasonId, Boolean(session));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!view) return null;
  const status = view.viewer.status;
  if (status === "in_event" || (!view.open && !view.canAddSelf && status !== "pending")) {
    return null;
  }

  async function run(fn: () => Promise<unknown>, done: string, after?: () => unknown) {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      await load();
      await after?.();
    } catch (e) {
      toast.error(errorMessage(e, "That didn't work."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Registration</h2>
        <p className="text-sm text-muted-foreground">
          {view.open
            ? `Open until the event starts${view.closesAt ? ` (${formatDateTime(view.closesAt, timezone)})` : ""}. The organisers accept each request.`
            : view.closedReason
              ? CLOSED_REASON[view.closedReason]
              : null}
        </p>
      </div>

      {view.open && status === "signed_out" ? (
        <div className="space-y-1 text-sm">
          <a
            className={buttonVariants({ className: "inline-block" })}
            href={signInHref(returnTo)}
          >
            Sign in to request to join
          </a>
          <p className="text-xs text-muted-foreground">
            Enigmic accounts are invite-only for now: no account? Ask the organisers for
            an invitation.
          </p>
        </div>
      ) : null}

      {view.open && (status === "none" || status === "declined") ? (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                bffFetch(`/v1/seasons/${seasonId}/join-requests`, {
                  method: "POST",
                  body: JSON.stringify({ note: note.trim() || null }),
                }),
              `Request sent: the organisers of ${seasonName} will let you know.`,
              () => setNote(""),
            );
          }}
        >
          <label className="flex flex-1 flex-col gap-1 text-sm text-foreground">
            Note for the organisers (optional)
            <input
              type="text"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. my Master Duel name, or when I can play"
            />
          </label>
          <button type="submit" className={buttonVariants()} disabled={busy}>
            Request to join
          </button>
        </form>
      ) : null}
      {status === "declined" && view.open ? (
        <p className="text-xs text-muted-foreground">
          The organisers declined your last request; you can ask again.
        </p>
      ) : null}

      {status === "pending" ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
            Request sent
          </span>
          <span className="text-muted-foreground">Waiting for the organisers.</span>
          <button
            type="button"
            className={buttonVariants({
              variant: "outline",
              className: "px-2 py-0.5 text-xs",
            })}
            disabled={busy}
            onClick={() =>
              void run(
                () =>
                  bffFetch(`/v1/seasons/${seasonId}/join-requests/mine`, {
                    method: "DELETE",
                  }),
                "Request cancelled.",
              )
            }
          >
            Cancel request
          </button>
        </div>
      ) : null}

      {view.canAddSelf ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">You organise this group:</span>
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy}
            onClick={() =>
              void run(
                () =>
                  bffFetch(`/v1/seasons/${seasonId}/participants/me`, {
                    method: "POST",
                    body: "{}",
                  }),
                `You're playing in ${seasonName}.`,
                onJoined,
              )
            }
          >
            Add myself as a player
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** Board → Settings: open or close registration (it closes by itself at the start). */
export function RegistrationPanel({
  seasonId,
  seasonName,
  timezone,
}: {
  seasonId: string;
  seasonName: string;
  timezone: string;
}) {
  const toast = useToast();
  const { view, load } = useRegistration(seasonId, true);
  const [busy, setBusy] = useState(false);
  if (!view) return null;

  async function set(open: boolean) {
    setBusy(true);
    try {
      await bffFetch(`/v1/seasons/${seasonId}/registration`, {
        method: "PUT",
        body: JSON.stringify({ open }),
      });
      toast.success(
        open
          ? `Registration for ${seasonName} is open.`
          : `Registration for ${seasonName} is closed.`,
      );
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't change registration."));
    } finally {
      setBusy(false);
    }
  }

  // The switch is on but the dates closed it (the event started).
  const blocked = view.closedReason !== null && view.closedReason !== "closed";
  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Registration</h2>
        <p className="text-sm text-muted-foreground">
          {view.open
            ? `Open: signed-in players can ask to join on the event page until it starts${view.closesAt ? ` (${formatDateTime(view.closesAt, timezone)})` : ""}. Requests appear on the Roster tab.`
            : view.closedReason
              ? CLOSED_REASON[view.closedReason]
              : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Registration">
        <button
          type="button"
          aria-pressed={view.open}
          className={buttonVariants({ variant: view.open ? "default" : "outline" })}
          disabled={busy || view.open || blocked}
          onClick={() => void set(true)}
        >
          Open
        </button>
        <button
          type="button"
          aria-pressed={!view.open}
          className={buttonVariants({ variant: !view.open ? "default" : "outline" })}
          disabled={busy || !view.registrationOpen}
          onClick={() => void set(false)}
        >
          Closed
        </button>
      </div>
    </section>
  );
}

/** Board → Roster: players' requests to join; organisers accept or decline. */
export function JoinRequestsPanel({
  seasonId,
  onDecided,
}: {
  seasonId: string;
  onDecided: () => Promise<void> | void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<JoinRequestRow[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await bffFetch<{ items: JoinRequestRow[] }>(
        `/v1/seasons/${seasonId}/join-requests`,
      );
      setItems(res.items);
    } catch {
      setItems([]);
    }
  }, [seasonId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (items.length === 0) return null;

  async function answer(request: JoinRequestRow, choice: "accept" | "decline") {
    setBusy(true);
    try {
      await bffFetch(`/v1/seasons/${seasonId}/join-requests/${request.id}/${choice}`, {
        method: "POST",
        body: "{}",
      });
      toast.success(
        choice === "accept"
          ? `${request.displayName} is on the roster.`
          : `${request.displayName}'s request declined.`,
      );
      await load();
      await onDecided();
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't answer the request."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Requests to join</h2>
        <p className="text-sm text-muted-foreground">
          Accepting puts them on the roster, linked to their account.
        </p>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border text-sm">
        {items.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{r.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[
                  r.email,
                  r.onlineClientUsername,
                  r.knownAs && r.knownAs !== r.displayName
                    ? `plays as ${r.knownAs} in this group`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {r.note ? <p className="text-xs text-foreground">“{r.note}”</p> : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonVariants({ className: "px-2 py-0.5 text-xs" })}
                disabled={busy}
                onClick={() => void answer(r, "accept")}
              >
                Accept
              </button>
              <button
                type="button"
                className={buttonVariants({
                  variant: "outline",
                  className: "px-2 py-0.5 text-xs",
                })}
                disabled={busy}
                onClick={() => void answer(r, "decline")}
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Board → Roster: an organiser of the group puts themselves on the event, with their profile. */
export function AddSelfButton({
  seasonId,
  seasonName,
  onJoined,
}: {
  seasonId: string;
  seasonName: string;
  onJoined: () => Promise<void> | void;
}) {
  const toast = useToast();
  const { view, load } = useRegistration(seasonId, true);
  const [busy, setBusy] = useState(false);
  if (!view?.canAddSelf) return null;
  return (
    <button
      type="button"
      className={buttonVariants({ variant: "outline" })}
      disabled={busy}
      title="Join as a player with your Account details. In your own matches your opponent confirms results and another organiser settles them."
      onClick={async () => {
        setBusy(true);
        try {
          await bffFetch(`/v1/seasons/${seasonId}/participants/me`, {
            method: "POST",
            body: "{}",
          });
          toast.success(`You're playing in ${seasonName}.`);
          await load();
          await onJoined();
        } catch (e) {
          toast.error(errorMessage(e, "Couldn't add you."));
        } finally {
          setBusy(false);
        }
      }}
    >
      Add myself
    </button>
  );
}
