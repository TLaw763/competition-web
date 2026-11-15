"use client";

import { buttonVariants } from "../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AllowedEmailsPanel } from "../../components/allowed-emails";
import { CardListNotices } from "../../components/card-list-updates";
import { useAuth } from "../../components/auth-provider";
import { useConfirm } from "../../components/confirm-dialog";
import { useAccess } from "../../lib/access";
import { bffFetch } from "../../lib/bff-client";
import { TIMEZONE_OPTIONS } from "../../lib/format-templates";
import type { GroupStaffMember } from "../../lib/types";

type GroupRow = { competitionId: string; name: string; staff: GroupStaffMember[] };
type Signups = { configured: boolean; open: boolean };

/** Platform admin (D-057): event groups and their main organisers (D-058). */
export default function AdminPage() {
  const { session, loading: authLoading } = useAuth();
  const { access, loading: accessLoading, reload } = useAccess();
  const confirm = useConfirm();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [timezone, setTimezone] = useState("Africa/Johannesburg");
  const [mainOrganiserEmail, setMainOrganiserEmail] = useState("");
  const [handover, setHandover] = useState<Record<string, string>>({});
  const [signups, setSignups] = useState<Signups | null>(null);
  const [signupsError, setSignupsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!access?.platformAdmin) return;
    const rows = await Promise.all(
      access.groups.map(async (g) => ({
        competitionId: g.competitionId,
        name: g.name,
        staff: (
          await bffFetch<{ items: GroupStaffMember[] }>(
            `/v1/competitions/${g.competitionId}/staff`,
          )
        ).items,
      })),
    );
    setGroups(rows);
  }, [access]);

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load groups"),
    );
  }, [load]);

  useEffect(() => {
    if (!access?.platformAdmin) return;
    void bffFetch<Signups>("/v1/admin/signups")
      .then(setSignups)
      .catch((e) =>
        setSignupsError(
          e instanceof Error ? e.message : "Couldn't read the sign-up setting",
        ),
      );
  }, [access]);

  async function setSignupsOpen(open: boolean) {
    const ok = await confirm(
      open
        ? {
            title: "Open sign-up?",
            body: "Anyone will be able to create an Enigmic account.",
            confirmLabel: "Open sign-up",
            danger: true,
          }
        : {
            title: "Close sign-up?",
            body: "Only people you invite will be able to create an account.",
            confirmLabel: "Close sign-up",
          },
    );
    if (!ok) return;
    void run(
      open ? "Sign-up is open." : "Sign-up is closed: invited people only.",
      async () => {
        setSignups(
          await bffFetch<Signups>("/v1/admin/signups", {
            method: "PUT",
            body: JSON.stringify({ open }),
          }),
        );
        setSignupsError(null);
      },
    );
  }

  async function run(done: string, fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      setMessage(done);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function createGroup() {
    void run(`Created ${name.trim()}.`, async () => {
      await bffFetch("/v1/competitions", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          visibility,
          timezone,
          mainOrganiserEmail: mainOrganiserEmail.trim(),
        }),
      });
      setName("");
      setDescription("");
      setMainOrganiserEmail("");
    });
  }

  async function changeMainOrganiser(group: GroupRow) {
    const email = handover[group.competitionId]?.trim();
    if (!email) return;
    if (
      !(await confirm({
        title: `Make ${email} the main organiser of ${group.name}?`,
        body: "The current main organiser stays on as an event organiser.",
        confirmLabel: "Change main organiser",
      }))
    ) {
      return;
    }
    void run(`${email} is now the main organiser of ${group.name}.`, async () => {
      await bffFetch(`/v1/competitions/${group.competitionId}/main-organiser`, {
        method: "PUT",
        body: JSON.stringify({ email }),
      });
      setHandover((prev) => ({ ...prev, [group.competitionId]: "" }));
    });
  }

  if (authLoading || (session && accessLoading)) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!session || !access?.platformAdmin) {
    return (
      <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm">
        <p>This page is for the platform admin.</p>
        <Link href="/organizer" className="font-medium">
          ← Organizer board
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Platform admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Create event groups and choose each group's main organiser. They create the
          events and add event organisers themselves.
        </p>
      </div>

      <CardListNotices />

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

      <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
        <h2 className="text-lg font-semibold text-foreground">Account sign-up</h2>
        <p className="text-sm text-muted-foreground">
          For every Enigmic app. While it&apos;s closed, only allowed emails can create an
          account: people invited to an event, and the list below. Existing accounts sign
          in as usual.
        </p>
        {signupsError ? (
          <p
            className={cn(
              "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
              "text-sm",
            )}
            role="alert"
          >
            {signupsError}
          </p>
        ) : !signups ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !signups.configured ? (
          <p className="text-sm text-muted-foreground">
            The sign-up switch isn&apos;t set up on this server (AUTHENTIK_SIGNUPS_TOKEN).
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-foreground" role="status">
              Sign-up is{" "}
              <strong>{signups.open ? "open" : "closed (invited people only)"}</strong>
            </p>
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              disabled={busy}
              onClick={() => void setSignupsOpen(!signups.open)}
            >
              {signups.open ? "Close sign-up" : "Open sign-up"}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
        <h2 className="text-lg font-semibold text-foreground">Allowed emails</h2>
        <AllowedEmailsPanel
          path="/v1/admin/allowed-emails"
          showGroup
          description="People who may create an account without being invited to an event, e.g. a future organiser. Yours, and each event group's (added by its main organiser)."
        />
      </section>

      <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5">
        <h2 className="text-lg font-semibold text-foreground">New event group</h2>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Name
          <input
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cape Town Store League"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Description (optional)
          <textarea
            className={cn(
              "min-h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
              "min-h-20",
            )}
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Visibility
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "public" | "private")}
            >
              <option value="public">Public calendar when fixtures are confirmed</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Timezone
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {(TIMEZONE_OPTIONS.includes(timezone)
                ? TIMEZONE_OPTIONS
                : [timezone, ...TIMEZONE_OPTIONS]
              ).map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Main organiser's email
          <input
            type="email"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            value={mainOrganiserEmail}
            onChange={(e) => setMainOrganiserEmail(e.target.value)}
            placeholder="They need to have signed in once"
          />
        </label>
        <button
          type="button"
          className={buttonVariants()}
          disabled={busy || !name.trim() || !mainOrganiserEmail.trim()}
          onClick={createGroup}
        >
          Create event group
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Event groups</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => {
              const main = group.staff.find((s) => s.role === "main_organiser");
              const organisers = group.staff.filter((s) => s.role === "organiser");
              return (
                <li
                  key={group.competitionId}
                  className={cn(
                    "rounded-xl border bg-card text-card-foreground shadow-xs",
                    "space-y-3 p-4 text-sm",
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-foreground">{group.name}</p>
                    <Link
                      href={`/organizer?groupId=${group.competitionId}`}
                      className="font-medium"
                    >
                      Open board →
                    </Link>
                  </div>
                  <p className="text-muted-foreground">
                    Main organiser:{" "}
                    {main
                      ? `${main.displayName}${main.email ? ` (${main.email})` : ""}`
                      : "—"}
                    {organisers.length
                      ? ` · Event organisers: ${organisers.map((o) => o.displayName).join(", ")}`
                      : ""}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex flex-col gap-1 text-foreground">
                      New main organiser's email
                      <input
                        type="email"
                        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                        value={handover[group.competitionId] ?? ""}
                        onChange={(e) =>
                          setHandover((prev) => ({
                            ...prev,
                            [group.competitionId]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className={buttonVariants({ variant: "outline" })}
                      disabled={busy || !handover[group.competitionId]?.trim()}
                      onClick={() => void changeMainOrganiser(group)}
                    >
                      Change main organiser
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
