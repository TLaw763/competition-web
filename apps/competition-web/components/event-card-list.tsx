"use client";

import { cn } from "@enigmic-co/ui/cn";

import { useEffect, useMemo, useState } from "react";
import { FilterSearch, FilterToolbar } from "@enigmic-co/ui/filters/FilterToolbar";
import { bffFetch, errorMessage } from "../lib/bff-client";
import { gameInfo } from "../lib/games";
import type { EventCardList, EventCardRow } from "../lib/types";

export const COPIES_LABEL = [
  "Forbidden",
  "Limited",
  "Semi-Limited",
  "Unlimited",
] as const;

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Where the list comes from, or why the official part is missing. */
function SourceNote({ list }: { list: EventCardList }) {
  const game = gameInfo(list.game)?.label ?? "";
  if (list.official) {
    return (
      <p className="text-sm text-muted-foreground">
        Official {game} list, effective {formatDay(list.official.effectiveFrom)} (
        <a href={list.official.sourceUrl} target="_blank" rel="noreferrer">
          source
        </a>
        ){list.basis === "start" ? ": the list in force when this event started" : ""}.
        The organisers move the event to newer lists. Changes made for this event are
        marked.
      </p>
    );
  }
  const why =
    list.officialStatus === "not_available"
      ? `The official ${game} list isn't available here yet.`
      : list.officialStatus === "unavailable"
        ? "The official list couldn't be loaded just now."
        : `No official ${game} list was found for ${formatDay(list.effectiveOn!)}.`;
  return (
    <p
      className={cn(
        "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
        "text-sm",
      )}
    >
      {why} {list.cards.length ? "This event's own changes are below." : ""}
    </p>
  );
}

const STATUS_LABEL = { added: "New", changed: "Changed", removed: "Freed" } as const;

/** A newer list the organisers accepted from its date: what changes then. */
function ComingNote({ list }: { list: EventCardList }) {
  const coming = list.coming;
  if (!coming || !list.kind) return null;
  const kind = list.kind;
  const label = (value: number) =>
    kind === "ban_list" ? COPIES_LABEL[value] : `${value} pts`;
  return (
    <section
      className={cn(
        "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
        "space-y-2 text-sm",
      )}
      aria-label="Coming list changes"
    >
      <p className="font-semibold text-foreground">
        Coming {formatDay(coming.effectiveFrom)}: this event moves to the new official
        list (
        <a href={coming.sourceUrl} target="_blank" rel="noreferrer">
          source
        </a>
        )
      </p>
      {coming.rows.length === 0 ? (
        <p className="text-muted-foreground">No card changes.</p>
      ) : (
        <ul className="divide-y divide-border">
          {coming.rows.map((row) => (
            <li key={row.cardId} className="flex flex-wrap justify-between gap-2 py-1.5">
              <span className="text-foreground">
                {row.name}{" "}
                <span className="text-xs text-muted-foreground">
                  {STATUS_LABEL[row.status]}
                </span>
              </span>
              <span className="text-muted-foreground">
                {label(row.before)} →{" "}
                <span className="font-medium text-foreground">{label(row.after)}</span>
                {row.eventChange
                  ? ` · this event stays ${label(row.eventChange.value)}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChangeNote({ row, kind }: { row: EventCardRow; kind: "ban_list" | "genesys" }) {
  if (row.event === null) return null;
  return (
    <span className="mt-1 block w-fit rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning sm:ml-2 sm:mt-0 sm:inline-block">
      Event change · official{" "}
      {kind === "ban_list" ? COPIES_LABEL[row.official] : `${row.official} pts`}
    </span>
  );
}

/** The event's Ban List or Genesys Points List tab. */
export function EventCardListTab({ seasonId }: { seasonId: string }) {
  const [list, setList] = useState<EventCardList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    bffFetch<EventCardList>(`/v1/public/seasons/${seasonId}/card-list`)
      .then((data) => !cancelled && setList(data))
      .catch((e) => !cancelled && setError(errorMessage(e, "Couldn't load the list")));
    return () => {
      cancelled = true;
    };
  }, [seasonId]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (list?.cards ?? []).filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [list, filter]);

  if (error) {
    return (
      <p
        className={cn(
          "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
          "text-sm",
        )}
        role="alert"
      >
        {error}
      </p>
    );
  }
  if (!list) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading the list">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (!list.kind) {
    return (
      <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
        This event&apos;s game hasn&apos;t been set, so it has no list.
      </p>
    );
  }
  const kind = list.kind;

  return (
    <div className="space-y-4">
      <SourceNote list={list} />
      <ComingNote list={list} />
      {list.cards.length > 8 ? (
        <FilterToolbar
          label="Find a card"
          search={
            <FilterSearch
              value={filter}
              onChange={setFilter}
              placeholder="Find a card…"
            />
          }
          activeCount={filter ? 1 : 0}
          onClear={() => setFilter("")}
        />
      ) : null}

      {list.cards.length === 0 ? (
        <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          No cards on the list.
        </p>
      ) : kind === "ban_list" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((copies) => {
            const rows = shown.filter((c) => c.value === copies);
            // Unlimited only lists cards this event un-limited.
            if (copies === 3 && rows.length === 0) return null;
            return (
              <section
                key={copies}
                className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-2 p-4"
              >
                <h3 className="flex items-center justify-between font-semibold text-foreground">
                  {copies === 3 ? "Unlimited at this event" : COPIES_LABEL[copies]}
                  <span className="text-sm font-normal text-muted-foreground">
                    {rows.length}
                  </span>
                </h3>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {filter ? "No match." : "None."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border text-sm">
                    {rows.map((row) => (
                      <li key={row.cardId ?? row.name} className="py-1.5 text-foreground">
                        {row.name}
                        <ChangeNote row={row} kind={kind} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Card</th>
                <th className="px-4 py-2 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((row) => (
                <tr key={row.cardId ?? row.name}>
                  <td className="px-4 py-2 text-foreground">
                    {row.name}
                    <ChangeNote row={row} kind={kind} />
                  </td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums text-foreground">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            Cards not listed are worth 0 points.
          </p>
        </section>
      )}
    </div>
  );
}
