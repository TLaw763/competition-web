"use client";

import { buttonVariants } from "./ui/button";
import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { bffFetch, errorMessage } from "../lib/bff-client";
import { gameInfo } from "../lib/games";
import type {
  CardListOffer,
  CardListUpdates,
  ListDiffRow,
  ListDiffSummary,
  MyCardListUpdates,
} from "../lib/types";
import { useConfirm } from "./confirm-dialog";
import { COPIES_LABEL, formatDay } from "./event-card-list";
import { useToast } from "./toast";

type Kind = "ban_list" | "genesys";
type CardAction = "keep" | "remove" | "set";

export function valueLabel(kind: Kind, value: number): string {
  return kind === "ban_list" ? (COPIES_LABEL[value] ?? String(value)) : `${value} pts`;
}

const STATUS_LABEL: Record<ListDiffRow["status"], string> = {
  added: "New",
  changed: "Changed",
  removed: "Freed",
};

export function summaryText(summary: ListDiffSummary): string {
  const parts = [
    `${summary.added} new`,
    `${summary.changed} changed`,
    `${summary.removed} freed`,
  ];
  if (summary.conflicts) {
    parts.push(
      `${summary.conflicts} ${summary.conflicts === 1 ? "touches" : "touch"} your changes`,
    );
  }
  return parts.join(" · ");
}

const inFuture = (iso: string) => Date.parse(iso) > Date.now();

/** What a newer list changes, card by card (organisers' own changes marked). */
export function ListDiffTable({ kind, rows }: { kind: Kind; rows: ListDiffRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No card changes.</p>;
  }
  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Card</th>
            <th className="px-3 py-2 font-medium">Now</th>
            <th className="px-3 py-2 font-medium">New list</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.cardId}>
              <td className="px-3 py-2 text-foreground">
                {row.name}{" "}
                <span className="text-xs text-muted-foreground">
                  {STATUS_LABEL[row.status]}
                </span>
                {row.eventChange ? (
                  <span className="mt-1 block w-fit rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                    This event: {valueLabel(kind, row.eventChange.value)}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {valueLabel(kind, row.before)}
              </td>
              <td className="px-3 py-2 font-medium text-foreground">
                {valueLabel(kind, row.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Review one newer list: what changes, the organisers' clashing changes, accept or reject. */
function Review({
  seasonId,
  kind,
  offer,
  onDone,
}: {
  seasonId: string;
  kind: Kind;
  offer: CardListOffer;
  onDone: (updates: CardListUpdates) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const future = inFuture(offer.effectiveFrom);
  const [from, setFrom] = useState<"now" | "effective_date">(
    future ? "effective_date" : "now",
  );
  const conflicts = offer.rows.filter((r) => r.eventChange);
  const [actions, setActions] = useState<
    Record<string, { action: CardAction; value: number }>
  >({});
  const [busy, setBusy] = useState(false);
  const max = kind === "ban_list" ? 3 : 100;

  const actionOf = (row: ListDiffRow) =>
    actions[row.eventChange!.changeId] ?? { action: "keep" as const, value: row.after };
  const valid = conflicts.every((row) => {
    const a = actionOf(row);
    return (
      a.action !== "set" || (Number.isInteger(a.value) && a.value >= 0 && a.value <= max)
    );
  });

  async function accept() {
    setBusy(true);
    try {
      const updates = await bffFetch<CardListUpdates>(
        `/v1/seasons/${seasonId}/card-list/updates/${encodeURIComponent(offer.releaseId)}/accept`,
        {
          method: "POST",
          body: JSON.stringify({
            from,
            cardActions: conflicts.map((row) => ({
              changeId: row.eventChange!.changeId,
              ...actionOf(row),
            })),
          }),
        },
      );
      toast.success(
        from === "effective_date" && future
          ? `The event switches to the new list on ${formatDay(offer.effectiveFrom)}.`
          : "The event now uses the new list.",
      );
      onDone(updates);
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't accept the list."));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    const ok = await confirm({
      title: "Stay on the current list?",
      body: "The event keeps its list and the notice goes away. You can still accept this list later from here.",
      confirmLabel: "Stay on current list",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const updates = await bffFetch<CardListUpdates>(
        `/v1/seasons/${seasonId}/card-list/updates/${encodeURIComponent(offer.releaseId)}/reject`,
        { method: "POST", body: "{}" },
      );
      toast.success("The event stays on its current list.");
      onDone(updates);
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't save that."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <ListDiffTable kind={kind} rows={offer.rows} />

      {conflicts.length ? (
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">
            Your changes this list touches
          </h4>
          <p className="text-sm text-muted-foreground">
            Your changes stay on top of the new list unless you choose otherwise.
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {conflicts.map((row) => {
              const id = row.eventChange!.changeId;
              const a = actionOf(row);
              const set = (next: Partial<{ action: CardAction; value: number }>) =>
                setActions((prev) => ({ ...prev, [id]: { ...a, ...next } }));
              return (
                <li key={id} className="flex flex-wrap items-end gap-3 px-3 py-2">
                  <div className="min-w-48 flex-1">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Official {valueLabel(kind, row.before)} →{" "}
                      {valueLabel(kind, row.after)} · this event{" "}
                      {valueLabel(kind, row.eventChange!.value)}
                    </p>
                  </div>
                  <label className="flex flex-col gap-1 text-foreground">
                    <span className="sr-only">What to do with {row.name}</span>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                      value={a.action}
                      onChange={(e) => set({ action: e.target.value as CardAction })}
                    >
                      <option value="keep">
                        Keep my change ({valueLabel(kind, row.eventChange!.value)})
                      </option>
                      <option value="remove">
                        Use the new official ({valueLabel(kind, row.after)})
                      </option>
                      <option value="set">Set a new value</option>
                    </select>
                  </label>
                  {a.action === "set" ? (
                    kind === "ban_list" ? (
                      <label className="flex flex-col gap-1 text-foreground">
                        <span className="sr-only">Copies of {row.name}</span>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                          value={a.value}
                          onChange={(e) => set({ value: Number(e.target.value) })}
                        >
                          {COPIES_LABEL.map((label, value) => (
                            <option key={label} value={value}>
                              {label} ({value})
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="flex flex-col gap-1 text-foreground">
                        <span className="sr-only">Points for {row.name}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={100}
                          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-24"
                          value={a.value}
                          onChange={(e) => set({ value: Number(e.target.value) })}
                        />
                      </label>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {future ? (
        <fieldset className="space-y-1 text-sm text-foreground">
          <legend className="font-semibold">When</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`from-${offer.releaseId}`}
              checked={from === "effective_date"}
              onChange={() => setFrom("effective_date")}
            />
            From {formatDay(offer.effectiveFrom)}, when it takes effect
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`from-${offer.releaseId}`}
              checked={from === "now"}
              onChange={() => setFrom("now")}
            />
            Now
          </label>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonVariants()}
          disabled={busy || !valid}
          onClick={() => void accept()}
        >
          {from === "effective_date" && future
            ? `Accept from ${formatDay(offer.effectiveFrom)}`
            : "Accept now"}
        </button>
        {offer.status === "pending" ? (
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy}
            onClick={() => void reject()}
          >
            Stay on current list
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Board → Settings: newer official lists for the event, a scheduled switch,
 * and the review to accept or reject one.
 */
export function CardListUpdatePanel({
  seasonId,
  game,
  onChanged,
}: {
  seasonId: string;
  game: string | null | undefined;
  onChanged: () => void;
}) {
  const toast = useToast();
  const info = gameInfo(game);
  const [updates, setUpdates] = useState<CardListUpdates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setUpdates(
        await bffFetch<CardListUpdates>(`/v1/seasons/${seasonId}/card-list/updates`),
      );
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Couldn't check for newer official lists."));
    }
  }, [seasonId]);

  useEffect(() => {
    if (info) void load();
  }, [info, load]);

  if (!info) return null;
  if (error)
    return (
      <p
        className={cn(
          "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
          "text-sm",
        )}
      >
        {error}
      </p>
    );
  if (!updates) return null;
  const { kind, next } = updates;
  const pending = updates.releases.filter((r) => r.status === "pending");
  const rejected = updates.releases.filter((r) => r.status === "rejected");
  if (!next && updates.releases.length === 0) return null;

  const done = (fresh: CardListUpdates) => {
    setUpdates(fresh);
    setOpen(null);
    onChanged();
  };

  async function cancelNext() {
    setBusy(true);
    try {
      done(
        await bffFetch<CardListUpdates>(`/v1/seasons/${seasonId}/card-list/next/cancel`, {
          method: "POST",
          body: "{}",
        }),
      );
      toast.success("Switch cancelled: the event stays on its current list.");
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't cancel the switch."));
    } finally {
      setBusy(false);
    }
  }

  const offerCard = (offer: CardListOffer) => (
    <div
      key={offer.releaseId}
      className={cn(
        "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
        "space-y-2 text-sm",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">
            {offer.status === "pending"
              ? "New official list"
              : "Official list you passed on"}
            {" · "}
            {inFuture(offer.effectiveFrom) ? "takes effect" : "in effect since"}{" "}
            {formatDay(offer.effectiveFrom)}
          </p>
          <p className="text-muted-foreground">
            {summaryText(offer.summary)} (
            <a href={offer.sourceUrl} target="_blank" rel="noreferrer">
              source
            </a>
            )
          </p>
        </div>
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          aria-expanded={open === offer.releaseId}
          onClick={() => setOpen(open === offer.releaseId ? null : offer.releaseId)}
        >
          {open === offer.releaseId ? "Close" : "Review"}
        </button>
      </div>
      {open === offer.releaseId ? (
        <Review seasonId={seasonId} kind={kind} offer={offer} onDone={done} />
      ) : null}
    </div>
  );

  return (
    <section
      className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5"
      aria-label="Official list updates"
    >
      <h2 className="text-lg font-semibold text-foreground">
        Official {info.label} list updates
      </h2>
      {next ? (
        <div
          className={cn(
            "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
            "space-y-2 text-sm",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">
                Switching to the new list on {formatDay(next.effectiveFrom)}
              </p>
              <p className="text-muted-foreground">
                {summaryText(next.summary)}. Players see what&apos;s coming on the
                event&apos;s {info.listTab} tab.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                aria-expanded={open === "next"}
                onClick={() => setOpen(open === "next" ? null : "next")}
              >
                {open === "next" ? "Close" : "Changes"}
              </button>
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                disabled={busy}
                onClick={() => void cancelNext()}
              >
                Undo
              </button>
            </div>
          </div>
          {open === "next" ? <ListDiffTable kind={kind} rows={next.rows} /> : null}
        </div>
      ) : null}
      {pending.map(offerCard)}
      {rejected.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Lists you passed on ({rejected.length})
          </summary>
          <div className="mt-2 space-y-2">{rejected.map(offerCard)}</div>
        </details>
      ) : null}
    </section>
  );
}

/**
 * Organizer board / admin: events with a newer official list to review, or a
 * switch coming up. Links to each event's board settings.
 */
export function CardListNotices() {
  const [data, setData] = useState<MyCardListUpdates | null>(null);

  useEffect(() => {
    let cancelled = false;
    bffFetch<MyCardListUpdates>("/v1/me/card-list-updates")
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data || data.items.length === 0) return null;
  const toReview = data.items.filter((i) => i.pending.length).length;

  return (
    <section
      className={cn(
        "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
        "space-y-2 text-sm",
      )}
      aria-label="Official list notices"
    >
      <p className="font-semibold text-foreground">
        {toReview
          ? `${toReview} ${toReview === 1 ? "event has" : "events have"} a new official list to review`
          : "Official list switches coming up"}
      </p>
      <ul className="space-y-1">
        {data.items.map((item) => {
          const label = gameInfo(item.game)?.label ?? "";
          const href = `/organizer?groupId=${encodeURIComponent(item.competitionId)}&seasonId=${encodeURIComponent(item.seasonId)}&tab=settings`;
          const first = item.pending[0];
          return (
            <li key={item.seasonId}>
              <Link href={href}>
                {item.seasonName}
                {item.competitionName ? ` (${item.competitionName})` : ""}
              </Link>
              {": "}
              {first
                ? `new ${label} list ${inFuture(first.effectiveFrom) ? "takes effect" : "in effect since"} ${formatDay(first.effectiveFrom)} · ${summaryText(first.summary)}`
                : item.next
                  ? `switches to the new ${label} list on ${formatDay(item.next.effectiveFrom)}`
                  : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
