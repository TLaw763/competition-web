"use client";

import { buttonVariants } from "./ui/button";

import { useCallback, useEffect, useState } from "react";
import { bffFetch } from "../lib/bff-client";
import { useConfirm } from "./confirm-dialog";

type AllowedEmail = {
  id: string;
  email: string;
  displayName: string;
  groupName: string | null;
  createdAt: string;
  accountExists: boolean;
};

/**
 * Emails allowed to create an Enigmic account while sign-up is closed
 * (invite-only sign-up). Adding one has Enigmic accounts email them a sign-up
 * link; they can also just sign up with that email. `path`: the admin's list
 * (`/v1/admin/allowed-emails`, which shows every group's too) or a group's.
 */
export function AllowedEmailsPanel({
  path,
  description,
  showGroup = false,
}: {
  path: string;
  description: string;
  showGroup?: boolean;
}) {
  const confirm = useConfirm();
  const [items, setItems] = useState<AllowedEmail[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems((await bffFetch<{ items: AllowedEmail[] }>(path)).items);
  }, [path]);

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Couldn't load the allowed emails"),
    );
  }, [load]);

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await fn());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function add() {
    void run(async () => {
      const added = await bffFetch<AllowedEmail>(path, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), displayName: name.trim() }),
      });
      setEmail("");
      setName("");
      return `We've emailed ${added.email} a link to create their account.`;
    });
  }

  async function remove(entry: AllowedEmail) {
    if (
      !(await confirm({
        title: `Remove ${entry.email}?`,
        body: "They won't be able to sign up while sign-up is closed.",
        confirmLabel: "Remove",
        danger: true,
      }))
    ) {
      return;
    }
    void run(async () => {
      await bffFetch(`${path}/${entry.id}`, { method: "DELETE" });
      return `${entry.email} removed.`;
    });
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">{description}</p>
      {message ? (
        <p
          className="rounded-md border border-info/35 bg-info-soft p-3 text-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-md border border-danger/35 bg-danger-soft p-3 text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-muted-foreground">None yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <div>
                <p className="font-medium text-foreground">
                  {entry.displayName} · {entry.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.accountExists ? "Has an account" : "Invited, no account yet"}
                  {showGroup ? ` · ${entry.groupName ?? "Platform"}` : ""}
                </p>
              </div>
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                disabled={busy}
                onClick={() => void remove(entry)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-foreground">
          Email
          <input
            type="email"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-foreground">
          Name
          <input
            type="text"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How others will see them"
          />
        </label>
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          disabled={busy || !email.trim() || !name.trim()}
          onClick={add}
        >
          Allow and email them
        </button>
      </div>
    </div>
  );
}
