"use client";

import { buttonVariants } from "./ui/button";
import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BffError, bffFetch, errorMessage, formatDateRange } from "../lib/bff-client";
import {
  eventHref,
  forgetLastEvent,
  lastEventOf,
  readLastEvent,
  rememberEvent,
} from "../lib/last-event";
import type {
  BracketStatus,
  EventPageData,
  PublicSeasonFixtures,
  SeasonResults,
  StandingRow,
  SwissStatus,
} from "../lib/types";
import { BracketTree } from "./bracket-view";
import { EventCalendar } from "./event-calendar";
import { gameInfo } from "../lib/games";
import { EventCardListTab } from "./event-card-list";
import { EventCover, EventLogo, GameBadge, PhaseBadge } from "./event-branding";
import { EventFixtures } from "./event-fixtures";
import { EventRegistration } from "./event-registration";
import { SeasonResultsList } from "./season-results";
import { ShareButton } from "./share-button";
import { EventSkeleton } from "./skeleton";
import { StandingsTable } from "./standings-table";

const TABS = [
  { id: "standings", label: "Standings" },
  { id: "fixtures", label: "Fixtures" },
  { id: "calendar", label: "Calendar" },
  { id: "results", label: "Results" },
  // Shown once the event has a game; labelled "Ban List" or "Genesys Points List".
  { id: "list", label: "List" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Loaded = {
  page: EventPageData;
  standings: StandingRow[];
  fixtures: PublicSeasonFixtures;
  results: SeasonResults;
  swiss: SwissStatus | null;
  bracket: BracketStatus | null;
};

/** An event's own page (/<group>/<event>): its table, matches and results, shareable. */
export function EventPage({
  groupSlug,
  seasonSlug,
}: {
  groupSlug: string;
  seasonSlug: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab");
  const asked: Tab = TABS.some((t) => t.id === requested)
    ? (requested as Tab)
    : "standings";
  const [data, setData] = useState<Loaded | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await bffFetch<EventPageData>(
        `/v1/public/events/by-slug/${groupSlug}/${seasonSlug}`,
      );
      const id = page.event.seasonId;
      const [table, fixtures, results, swiss, bracket] = await Promise.all([
        bffFetch<{ standings: StandingRow[] }>(`/v1/seasons/${id}/standings`),
        bffFetch<PublicSeasonFixtures>(`/v1/public/seasons/${id}/fixtures`),
        bffFetch<SeasonResults>(`/v1/public/seasons/${id}/results`),
        // 404 for events without Swiss rounds or a bracket.
        bffFetch<SwissStatus>(`/v1/seasons/${id}/swiss`).catch(() => null),
        bffFetch<BracketStatus>(`/v1/seasons/${id}/bracket`).catch(() => null),
      ]);
      setData({ page, standings: table.standings, fixtures, results, swiss, bracket });
      // The link as the API knows it (it may differ in case from the address typed).
      rememberEvent(lastEventOf(page.event));
    } catch (e) {
      if (e instanceof BffError && e.status === 404) {
        const saved = readLastEvent();
        if (saved?.groupSlug === groupSlug && saved.seasonSlug === seasonSlug)
          forgetLastEvent();
        setMissing(true);
      } else {
        setError(errorMessage(e, "Couldn't load this event"));
      }
    }
  }, [groupSlug, seasonSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  // On a phone the tab row scrolls sideways: keep the open tab in view.
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('nav[aria-label="Event"]');
    const open = bar?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!bar || !open) return;
    const right = open.offsetLeft + open.offsetWidth;
    if (open.offsetLeft < bar.scrollLeft || right > bar.scrollLeft + bar.clientWidth) {
      bar.scrollLeft = Math.max(0, right - bar.clientWidth);
    }
  }, [requested, data]);

  if (missing) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Event not found
        </h1>
        <p className="text-sm text-muted-foreground">
          This link doesn&apos;t match an event you can see. If it belongs to a private
          group, sign in with an account that&apos;s in it.
        </p>
        <Link
          href="/"
          className={buttonVariants({ className: "inline-block no-underline" })}
        >
          See all events
        </Link>
      </section>
    );
  }
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
  if (!data) return <EventSkeleton />;

  const { page, standings, fixtures, results, swiss, bracket } = data;
  const event = page.event;
  const game = gameInfo(event.game);
  const tabs = TABS.flatMap((t): Array<{ id: Tab; label: string }> =>
    t.id !== "list" ? [t] : game ? [{ id: t.id, label: game.listTab }] : [],
  );
  const tab: Tab = tabs.some((t) => t.id === asked) ? asked : "standings";
  const ended = event.phase === "past";
  const here = eventHref({ groupSlug: page.group.slug, seasonSlug: event.seasonSlug });

  return (
    <section className="space-y-5">
      <header className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden">
        <EventCover url={event.coverUrl} className="h-28 sm:h-40" />
        <div className="flex flex-wrap items-end gap-4 p-4 sm:p-5">
          <div className="-mt-12 sm:-mt-14">
            <EventLogo
              name={page.group.name}
              url={event.logoUrl}
              game={event.game}
              size="lg"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{page.group.name}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {event.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <PhaseBadge phase={event.phase} />
              <GameBadge game={event.game} />
              {page.group.private ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  Private group
                </span>
              ) : null}
              {event.hidden ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  Hidden: players and organisers only
                </span>
              ) : null}
              {event.startsAt ? (
                <span>
                  {formatDateRange(event.startsAt, event.endsAt, page.group.timezone)}
                </span>
              ) : null}
              <span>
                {event.playerCount} player{event.playerCount === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {page.events.length > 1 ? (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Season
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  value={event.seasonSlug}
                  onChange={(e) =>
                    router.push(
                      eventHref(
                        { groupSlug: page.group.slug, seasonSlug: e.target.value },
                        tab,
                      ),
                    )
                  }
                >
                  {page.events.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.name}
                      {e.phase === "past"
                        ? " (ended)"
                        : e.phase === "upcoming"
                          ? " (upcoming)"
                          : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {!page.group.private && !event.hidden ? (
              <ShareButton
                title={`${page.group.name}: ${event.name}`}
                path={`${here}?tab=${tab}`}
              />
            ) : null}
          </div>
        </div>
        {page.group.description ? (
          <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-5">
            {page.group.description}
          </p>
        ) : null}
      </header>

      {!ended ? (
        <EventRegistration
          seasonId={event.seasonId}
          seasonName={event.name}
          timezone={page.group.timezone}
          returnTo={here}
          onJoined={load}
        />
      ) : null}

      {ended && event.winner ? (
        <p
          className={cn(
            "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
            "text-sm",
          )}
        >
          Final table. 🏆 Winner:{" "}
          <Link
            href={`/players/${event.winner.participantId}?seasonId=${event.seasonId}`}
            className="font-semibold"
          >
            {event.winner.displayName}
          </Link>
          {event.runnerUp ? ` · Runner-up: ${event.runnerUp.displayName}` : ""}
        </p>
      ) : null}

      <nav
        className="flex gap-1 overflow-x-auto border-b border-border"
        role="tablist"
        aria-label="Event"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`event-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="event-panel"
            className="-mb-px whitespace-nowrap border-b-2 border-transparent px-2 py-2 text-sm font-medium text-muted-foreground no-underline hover:text-foreground aria-selected:border-primary aria-selected:text-foreground sm:px-3"
            onClick={() =>
              router.replace(`${here}${t.id === "standings" ? "" : `?tab=${t.id}`}`, {
                scroll: false,
              })
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div
        id="event-panel"
        role="tabpanel"
        aria-labelledby={`event-tab-${tab}`}
        className="space-y-4"
      >
        {tab === "standings" ? (
          <>
            {swiss ? (
              <p className="text-sm text-muted-foreground">
                Swiss · {swiss.complete ? "all" : `${swiss.roundsPaired} of`}{" "}
                {swiss.roundsTotal} rounds{swiss.complete ? " played" : " paired"}. Ties
                are broken by opponents&apos; match-win % (OMW%), then their
                opponents&apos; (OOMW%).
              </p>
            ) : null}
            {bracket?.bracket ? (
              <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-4">
                <h2 className="text-lg font-semibold text-foreground">Bracket</h2>
                <BracketTree bracket={bracket.bracket} seasonId={event.seasonId} />
              </section>
            ) : null}
            {standings.length === 0 ? (
              <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
                No standings yet. They appear once the first result is final.
              </p>
            ) : (
              <StandingsTable rows={standings} swissRounds={swiss?.roundsTotal} />
            )}
          </>
        ) : null}
        {tab === "fixtures" ? (
          <EventFixtures
            data={fixtures}
            timezone={page.group.timezone}
            seasonId={event.seasonId}
            calendarHref={`${here}?tab=calendar`}
          />
        ) : null}
        {tab === "calendar" ? (
          <EventCalendar
            seasonId={event.seasonId}
            timezone={page.group.timezone}
            // Private groups' and hidden events' matches aren't in the public feed.
            isPublic={!page.group.private && !event.hidden}
          />
        ) : null}
        {tab === "results" ? (
          results.rounds.length > 0 ? (
            <SeasonResultsList results={results} timezone={page.group.timezone} />
          ) : (
            <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
              No results yet.
            </p>
          )
        ) : null}
        {tab === "list" ? <EventCardListTab seasonId={event.seasonId} /> : null}
      </div>
    </section>
  );
}
