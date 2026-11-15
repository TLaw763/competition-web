"use client";

import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FilterPanel,
  FilterSearch,
  FilterToolbar,
} from "@enigmic-co/ui/filters/FilterToolbar";
import { FilterSingleSelect } from "@enigmic-co/ui/filters/FilterSingleSelect";
import { SortControl, type SortDirection } from "@enigmic-co/ui/filters/SortControl";
import { bffFetch, errorMessage, formatDateRange } from "../lib/bff-client";
import { gameInfo } from "../lib/games";
import { eventHref } from "../lib/last-event";
import type { EventCard, EventPhase } from "../lib/types";
import { EventCover, EventLogo, GameBadge, PhaseBadge } from "./event-branding";
import { CardsSkeleton } from "./skeleton";

const TABS: Array<{ id: EventPhase; label: string; empty: string }> = [
  { id: "ongoing", label: "Ongoing", empty: "No events are running right now." },
  { id: "upcoming", label: "Upcoming", empty: "Nothing announced yet." },
  { id: "past", label: "Past", empty: "No finished events yet." },
];

type SortField = "date" | "name" | "players";
const SORTS: Array<{ value: SortField; label: string }> = [
  { value: "date", label: "Date" },
  { value: "name", label: "Name" },
  { value: "players", label: "Players" },
];
// Each tab's natural order: the next to start, the latest to finish.
const DEFAULT_DIRECTION: Record<EventPhase, SortDirection> = {
  ongoing: "asc",
  upcoming: "asc",
  past: "desc",
};

function compareEvents(a: EventCard, b: EventCard, field: SortField, phase: EventPhase) {
  if (field === "name") return a.name.localeCompare(b.name);
  if (field === "players") return a.playerCount - b.playerCount;
  const date = (e: EventCard) =>
    (phase === "past" ? (e.endsAt ?? e.startsAt) : e.startsAt) ?? "";
  return date(a).localeCompare(date(b)) || a.name.localeCompare(b.name);
}

/**
 * Every event you can see, as cards: Ongoing (default), Upcoming and Past tabs,
 * each with the shared filter toolbar (search, game, group, sort; styling guide
 * "Filters and sorting"). Filters and sort live in the URL.
 */
export function HomeEvents() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab");
  const game = params.get("game");
  const group = params.get("group");
  const sortField: SortField =
    SORTS.find((s) => s.value === params.get("sort"))?.value ?? "date";
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  useEffect(() => setQuery(urlQuery), [urlQuery]);
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void bffFetch<{ items: EventCard[] }>("/v1/public/events")
      .then((res) => setEvents(res.items))
      .catch((e) => setError(errorMessage(e, "Couldn't load the events")));
  }, []);

  const byPhase = useMemo(() => {
    const groups: Record<EventPhase, EventCard[]> = {
      ongoing: [],
      upcoming: [],
      past: [],
    };
    for (const event of events ?? []) groups[event.phase].push(event);
    return groups;
  }, [events]);

  // Without a choice, the first tab that has something in it.
  const tab: EventPhase =
    TABS.find((t) => t.id === requested)?.id ??
    TABS.find((t) => byPhase[t.id].length > 0)?.id ??
    "ongoing";
  const current = TABS.find((t) => t.id === tab)!;
  const direction: SortDirection =
    params.get("dir") === "asc" || params.get("dir") === "desc"
      ? (params.get("dir") as SortDirection)
      : DEFAULT_DIRECTION[tab];

  // Options from every event, so they don't change between tabs.
  const gameOptions = useMemo(() => {
    const ids = [
      ...new Set((events ?? []).map((e) => e.game).filter(Boolean)),
    ] as string[];
    return ids
      .map((id) => ({ value: id, label: gameInfo(id)?.label ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [events]);
  const groupOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of events ?? []) seen.set(e.groupSlug, e.groupName);
    return [...seen]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [events]);

  const shown = useMemo(() => {
    const q = urlQuery.trim().toLowerCase();
    const list = byPhase[tab].filter(
      (e) =>
        (!q ||
          e.name.toLowerCase().includes(q) ||
          e.groupName.toLowerCase().includes(q)) &&
        (!game || e.game === game) &&
        (!group || e.groupSlug === group),
    );
    const sign = direction === "asc" ? 1 : -1;
    return list.sort((a, b) => sign * compareEvents(a, b, sortField, tab));
  }, [byPhase, tab, urlQuery, game, group, sortField, direction]);

  /** Sets (or, with null, removes) URL parameters, keeping the rest. */
  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }

  // The search box updates the URL after a pause in typing.
  useEffect(() => {
    if (query === urlQuery) return;
    const timer = setTimeout(() => update({ q: query.trim() || null }), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const activeCount = [urlQuery, game, group].filter(Boolean).length;

  return (
    <section className="space-y-4" aria-labelledby="events-heading">
      <h2 id="events-heading" className="sr-only">
        Events
      </h2>
      <nav
        className="flex gap-1 overflow-x-auto border-b border-border"
        role="tablist"
        aria-label="Events"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`home-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="home-panel"
            className="-mb-px whitespace-nowrap border-b-2 border-transparent px-2 py-2 text-sm font-medium text-muted-foreground no-underline hover:text-foreground aria-selected:border-primary aria-selected:text-foreground sm:px-3"
            // Changing tab keeps the filters; the sort direction resets to the tab's own.
            onClick={() => update({ tab: t.id, dir: null })}
          >
            {t.label}
            {events ? (
              <span className="ml-1 text-xs text-muted-foreground">
                ({byPhase[t.id].length})
              </span>
            ) : null}
          </button>
        ))}
      </nav>
      <FilterPanel
        id="home-panel"
        role="tabpanel"
        aria-labelledby={`home-tab-${tab}`}
        className="space-y-4"
      >
        <FilterToolbar
          label="Filter events"
          search={
            <FilterSearch
              value={query}
              onChange={setQuery}
              placeholder="Search events or groups…"
            />
          }
          filters={
            <>
              {gameOptions.length > 1 ? (
                <FilterSingleSelect
                  label="Game"
                  value={game}
                  options={gameOptions}
                  onChange={(value) => update({ game: value })}
                  placeholder="Any"
                />
              ) : null}
              {groupOptions.length > 1 ? (
                <FilterSingleSelect
                  label="Group"
                  value={group}
                  options={groupOptions}
                  onChange={(value) => update({ group: value })}
                  placeholder="Any"
                />
              ) : null}
            </>
          }
          sort={
            <SortControl
              options={SORTS}
              field={sortField}
              direction={direction}
              onChange={(next) =>
                update({
                  sort: next.field === "date" ? null : next.field,
                  dir: next.direction === DEFAULT_DIRECTION[tab] ? null : next.direction,
                })
              }
            />
          }
          activeCount={activeCount}
          onClear={() => {
            setQuery("");
            update({ q: null, game: null, group: null });
          }}
        />
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
        ) : events === null ? (
          <CardsSkeleton />
        ) : byPhase[tab].length === 0 ? (
          <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            {current.empty}
          </p>
        ) : shown.length === 0 ? (
          <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            No {current.label.toLowerCase()} events match these filters.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((event) => (
              <li key={event.seasonId}>
                <EventCardLink event={event} />
              </li>
            ))}
          </ul>
        )}
      </FilterPanel>
    </section>
  );
}

function EventCardLink({ event }: { event: EventCard }) {
  const person =
    event.phase === "past"
      ? event.winner && { label: "🏆 Winner", name: event.winner.displayName }
      : event.leader && { label: "Leading", name: event.leader.displayName };
  return (
    <Link
      href={eventHref({ groupSlug: event.groupSlug, seasonSlug: event.seasonSlug })}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-xs",
        "block h-full overflow-hidden no-underline transition-colors duration-200 hover:border-primary",
      )}
    >
      <EventCover url={event.coverUrl} className="h-24" />
      <div className="flex gap-3 p-4">
        <div className="-mt-10">
          <EventLogo name={event.groupName} url={event.logoUrl} game={event.game} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-xs text-muted-foreground">
            {event.groupName}
            {event.private ? " · Private" : ""}
            {event.hidden ? " · Hidden" : ""}
          </p>
          <h3 className="truncate text-lg font-semibold text-foreground">{event.name}</h3>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <PhaseBadge phase={event.phase} />
            <GameBadge game={event.game} />
            {event.registrationOpen ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
                Registration open
              </span>
            ) : null}
            {event.startsAt ? (
              <span>{formatDateRange(event.startsAt, event.endsAt, event.timezone)}</span>
            ) : null}
            <span>
              {event.playerCount} player{event.playerCount === 1 ? "" : "s"}
            </span>
          </p>
          {person ? (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">{person.label}:</span> {person.name}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
