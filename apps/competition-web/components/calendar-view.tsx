"use client";

import { buttonVariants } from "./ui/button";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FixtureStateBadge } from "./site-chrome";
import { formatDateTime } from "../lib/bff-client";
import type { PublicCalendarItem } from "../lib/types";

type CalendarViewProps = {
  items: PublicCalendarItem[];
  timezone?: string;
  seasonId?: string;
  /** Subscribe / download links; left out for private events. */
  icsUrl?: string;
  /** Links to public fixture pages; off for private events (they'd 404). */
  fixtureLinks?: boolean;
};

type ViewMode = "month" | "list";

export function CalendarView({
  items,
  timezone,
  seasonId,
  icsUrl,
  fixtureLinks = true,
}: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>("month");
  const [showPast, setShowPast] = useState(false);
  /** The day whose matches are listed under the month grid (YYYY-MM-DD). */
  const [selected, setSelected] = useState<string | null>(null);
  // Subscribing needs an absolute webcal:// link; known only in the browser.
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  useEffect(() => {
    setSubscribeUrl(icsUrl ? `webcal://${window.location.host}${icsUrl}` : null);
  }, [icsUrl]);
  /** The day whose pop-up is open (pointer over it or focus in it). */
  const [peek, setPeek] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openPeek = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPeek(key);
  };
  // A moment's grace, so the pointer can cross the gap into the pop-up.
  const closePeek = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPeek(null), 150);
  };
  useEffect(() => {
    if (!peek) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPeek(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [peek]);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const monthDays = useMemo(() => buildMonthGrid(month), [month]);
  const itemsByDay = useMemo(() => {
    const map = new Map<string, PublicCalendarItem[]>();
    for (const item of items) {
      const key = dayKey(new Date(item.confirmedStartAt), timezone);
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return map;
  }, [items, timezone]);
  // The list starts with today's matches; earlier ones wait behind "Show past".
  const today = dayKey(new Date(), timezone);
  const past = items.filter(
    (i) => dayKey(new Date(i.confirmedStartAt), timezone) < today,
  );
  const upcoming = items.filter(
    (i) => dayKey(new Date(i.confirmedStartAt), timezone) >= today,
  );
  // Today until a day is picked.
  const selectedDay = selected ?? today;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={view === "month"}
            className={buttonVariants({
              variant: view === "month" ? "default" : "outline",
            })}
            onClick={() => setView("month")}
          >
            Month
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            className={buttonVariants({
              variant: view === "list" ? "default" : "outline",
            })}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {subscribeUrl ? (
            <a
              href={subscribeUrl}
              className={buttonVariants({
                variant: "outline",
                className: "no-underline",
              })}
            >
              Subscribe
            </a>
          ) : null}
          {icsUrl ? (
            <a
              href={icsUrl}
              className={buttonVariants({
                variant: "outline",
                className: "no-underline",
              })}
            >
              Download .ics
            </a>
          ) : null}
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
              No upcoming fixtures.
            </div>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((entry) => (
                <CalendarEntry
                  key={entry.fixtureId}
                  entry={entry}
                  timezone={timezone}
                  seasonId={seasonId ?? entry.seasonId}
                  fixtureLinks={fixtureLinks}
                />
              ))}
            </ul>
          )}
          {past.length > 0 ? (
            <>
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                aria-expanded={showPast}
                onClick={() => setShowPast((v) => !v)}
              >
                {showPast ? "Hide past" : `Show past (${past.length})`}
              </button>
              {showPast ? (
                <ul className="space-y-3">
                  {[...past].reverse().map((entry) => (
                    <CalendarEntry
                      key={entry.fixtureId}
                      entry={entry}
                      timezone={timezone}
                      seasonId={seasonId ?? entry.seasonId}
                      fixtureLinks={fixtureLinks}
                    />
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        // Not overflow-hidden: the day pop-ups reach past the grid.
        <div className="rounded-xl border bg-card text-card-foreground shadow-xs p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() => setMonth((current) => addMonths(current, -1))}
            >
              Previous
            </button>
            <p className="font-semibold text-foreground">
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() => setMonth((current) => addMonths(current, 1))}
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-border bg-muted text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div key={label} className="px-2 py-2">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, index) => {
              const key = dayKey(day.date, timezone);
              const dayItems = itemsByDay.get(key) ?? [];
              const inMonth = day.inMonth;
              const isSelected = key === selectedDay;
              const peeking = peek === key && dayItems.length > 0;
              return (
                <div
                  key={day.iso}
                  className={`relative min-h-20 border-b border-r border-border p-1 sm:min-h-28 sm:p-2 ${
                    inMonth ? "bg-card" : "bg-muted/60"
                  } ${isSelected ? "ring-2 ring-inset ring-ring" : ""} ${
                    peeking ? "z-20" : ""
                  }`}
                  onMouseEnter={() => dayItems.length > 0 && openPeek(key)}
                  onMouseLeave={closePeek}
                  onFocus={() => dayItems.length > 0 && openPeek(key)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      closePeek();
                    }
                  }}
                >
                  {/* The whole day on a phone: its number and how many matches. */}
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-1 text-left"
                    aria-pressed={isSelected}
                    aria-label={`${day.date.toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}: ${dayItems.length} match${dayItems.length === 1 ? "" : "es"}`}
                    onClick={() => setSelected(key)}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        key === today
                          ? "rounded-full bg-primary px-1.5 text-primary-foreground"
                          : inMonth
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {dayItems.length > 0 ? (
                      <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold text-foreground sm:hidden">
                        {dayItems.length}
                      </span>
                    ) : null}
                  </button>
                  <ul className="mt-1 hidden space-y-1 sm:block">
                    {dayItems.slice(0, 2).map((entry) => (
                      <li key={entry.fixtureId}>
                        {/* The pop-up has the links; the cell only previews. */}
                        <span className="block truncate text-xs font-medium text-foreground">
                          <span className="tabular-nums text-muted-foreground">
                            {timeOfDay(entry.confirmedStartAt, timezone)}
                          </span>{" "}
                          {entry.participantADisplayName} vs{" "}
                          {entry.participantBDisplayName}
                        </span>
                      </li>
                    ))}
                    {dayItems.length > 2 ? (
                      <li>
                        <button
                          type="button"
                          className="text-xs font-medium text-foreground hover:underline"
                          onClick={() => setSelected(key)}
                        >
                          +{dayItems.length - 2} more
                        </button>
                      </li>
                    ) : null}
                  </ul>
                  {peeking ? (
                    <DayPopup
                      day={key}
                      items={dayItems}
                      timezone={timezone}
                      fixtureLinks={fixtureLinks}
                      // Right-hand columns open leftwards, the bottom rows upwards.
                      placement={`${index % 7 >= 4 ? "right-0" : "left-0"} ${
                        index >= 28 ? "bottom-full mb-1" : "top-full mt-1"
                      }`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <DayMatches
            day={selectedDay}
            items={itemsByDay.get(selectedDay) ?? []}
            timezone={timezone}
            fixtureLinks={fixtureLinks}
          />
        </div>
      )}
    </div>
  );
}

/** The chosen day's matches, under the month grid (on phones, the only day list). */
function DayMatches({
  day,
  items,
  timezone,
  fixtureLinks,
}: {
  day: string;
  items: PublicCalendarItem[];
  timezone?: string;
  fixtureLinks: boolean;
}) {
  return (
    <div className="border-t border-border p-4" aria-live="polite">
      <h2 className="text-sm font-semibold text-foreground">{dayLabel(day)}</h2>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">No matches this day.</p>
      ) : (
        <DayList items={items} timezone={timezone} fixtureLinks={fixtureLinks} />
      )}
    </div>
  );
}

/** Hovering (or focusing) a day: all its matches, with their stream links. */
function DayPopup({
  day,
  items,
  timezone,
  fixtureLinks,
  placement,
}: {
  day: string;
  items: PublicCalendarItem[];
  timezone?: string;
  fixtureLinks: boolean;
  placement: string;
}) {
  return (
    <div
      role="dialog"
      aria-label={`Matches on ${dayLabel(day)}`}
      className={`rounded-xl border bg-card text-card-foreground shadow-xs absolute ${placement} z-30 hidden max-h-96 w-80 overflow-y-auto p-3 text-left shadow-lg sm:block`}
    >
      <p className="text-sm font-semibold text-foreground">
        {dayLabel(day)} · {items.length} match{items.length === 1 ? "" : "es"}
      </p>
      <DayList items={items} timezone={timezone} fixtureLinks={fixtureLinks} />
    </div>
  );
}

function DayList({
  items,
  timezone,
  fixtureLinks,
}: {
  items: PublicCalendarItem[];
  timezone?: string;
  fixtureLinks: boolean;
}) {
  return (
    <ul className="mt-2 divide-y divide-border">
      {items.map((entry) => (
        <li key={entry.fixtureId} className="space-y-1 py-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="tabular-nums text-muted-foreground">
              {timeOfDay(entry.confirmedStartAt, timezone)}
            </span>
            {fixtureLinks ? (
              <Link
                href={`/fixtures/${entry.fixtureId}`}
                className="min-w-0 flex-1 truncate text-foreground no-underline hover:text-muted-foreground"
              >
                {entry.participantADisplayName} vs {entry.participantBDisplayName}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 truncate text-foreground">
                {entry.participantADisplayName} vs {entry.participantBDisplayName}
              </span>
            )}
            <FixtureStateBadge state={entry.state} />
          </div>
          <StreamLinks links={entry.streamLinks} />
        </li>
      ))}
    </ul>
  );
}

/** A Watch link per stream (opens in a new tab). */
function StreamLinks({ links }: { links: PublicCalendarItem["streamLinks"] }) {
  if (!links?.length) return null;
  return (
    <p className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-foreground no-underline hover:underline"
        >
          <span aria-hidden="true">▶</span>
          Watch{link.label ? `: ${link.label}` : ""}
        </a>
      ))}
    </p>
  );
}

function CalendarEntry({
  entry,
  timezone,
  seasonId,
  fixtureLinks,
}: {
  entry: PublicCalendarItem;
  timezone?: string;
  seasonId: string;
  fixtureLinks: boolean;
}) {
  return (
    <li className="rounded-xl border bg-card text-card-foreground shadow-xs p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-semibold text-foreground">
          <Link
            href={`/players/${entry.participantAId}?seasonId=${seasonId}`}
            className="text-foreground no-underline hover:text-muted-foreground"
          >
            {entry.participantADisplayName}
          </Link>
          {" vs "}
          <Link
            href={`/players/${entry.participantBId}?seasonId=${seasonId}`}
            className="text-foreground no-underline hover:text-muted-foreground"
          >
            {entry.participantBDisplayName}
          </Link>
          {fixtureLinks ? (
            <Link
              href={`/fixtures/${entry.fixtureId}`}
              className="ml-2 text-sm font-medium text-muted-foreground no-underline hover:text-muted-foreground"
            >
              View fixture
            </Link>
          ) : null}
        </p>
        <FixtureStateBadge state={entry.state} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatDateTime(entry.confirmedStartAt, timezone)}
      </p>
      <div className="mt-2">
        <StreamLinks links={entry.streamLinks} />
      </div>
    </li>
  );
}

function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function buildMonthGrid(month: Date) {
  const first = startOfMonth(month);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      iso: date.toISOString(),
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function timeOfDay(iso: string, timezone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function dayKey(date: Date, timezone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
