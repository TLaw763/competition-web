"use client";

import { buttonVariants } from "./ui/button";
import { cn } from "@enigmic-co/ui/cn";

import { useEffect, useState } from "react";
import { bffFetch } from "../lib/bff-client";
import { useConfirm } from "./confirm-dialog";

type FeedLink = { url: string; webcalUrl: string };

/** The player's own match calendar: a private link calendar apps subscribe to. */
export function CalendarFeedPanel() {
  const confirm = useConfirm();
  const [link, setLink] = useState<FeedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void bffFetch<FeedLink>("/v1/me/calendar-feed")
      .then(setLink)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Couldn't load your calendar link"),
      );
  }, []);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy: select the link and copy it instead.");
    }
  }

  async function reset() {
    if (
      !(await confirm({
        title: "Make a new link?",
        body: "Calendars subscribed with the old one stop updating; subscribe again with the new one.",
        confirmLabel: "Make a new link",
      }))
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setLink(
        await bffFetch<FeedLink>("/v1/me/calendar-feed/reset", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't make a new link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-xs",
        "space-y-3 p-4 text-sm",
      )}
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">Your match calendar</h2>
        <p className="text-muted-foreground">
          Your matches with a confirmed time, in every event, in your own calendar app. It
          updates itself when a time changes or a match is cancelled. Keep the link to
          yourself: anyone with it can see your matches.
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
      {link ? (
        <>
          <div className="flex flex-wrap gap-2">
            <a
              href={link.webcalUrl}
              className={buttonVariants({ className: "no-underline" })}
            >
              Subscribe in your calendar app
            </a>
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() => void copy()}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <input
            readOnly
            aria-label="Calendar link"
            className={cn(
              "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
              "w-full font-mono text-xs",
            )}
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
          />
          <p className="text-xs text-muted-foreground">
            Google Calendar: Other calendars → + → From URL, and paste the link. Apple
            Calendar and Outlook open the Subscribe button directly.
          </p>
          <button
            type="button"
            className={buttonVariants({ variant: "outline", className: "text-xs" })}
            disabled={busy}
            onClick={() => void reset()}
          >
            Make a new link
          </button>
        </>
      ) : !error ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : null}
    </div>
  );
}
