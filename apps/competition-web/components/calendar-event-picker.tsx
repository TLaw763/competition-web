"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { lastEventOf, readLastEvent, rememberEvent } from "../lib/last-event";
import type { EventCard } from "../lib/types";

/** `?seasonId=all`: every public event, and don't jump to the last one opened. */
export const ALL_EVENTS = "all";

/**
 * Which event's fixtures the calendar shows. With no choice in the link, it
 * opens the event last viewed (if it's in the list).
 */
export function CalendarEventPicker({
  events,
  seasonId,
  chosen,
}: {
  events: EventCard[];
  seasonId: string | null;
  /** The link names an event (or "all"): don't follow the remembered one. */
  chosen: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (chosen) return;
    const saved = readLastEvent();
    const match =
      saved &&
      events.find(
        (e) => e.groupSlug === saved.groupSlug && e.seasonSlug === saved.seasonSlug,
      );
    if (match) router.replace(`/calendar?seasonId=${encodeURIComponent(match.seasonId)}`);
  }, [chosen, events, router]);

  if (events.length < 2) return null;
  return (
    <label className="flex flex-col gap-1 text-sm text-foreground sm:max-w-sm">
      Event
      <select
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        value={seasonId ?? ALL_EVENTS}
        onChange={(e) => {
          const next = events.find((ev) => ev.seasonId === e.target.value);
          if (next) rememberEvent(lastEventOf(next));
          router.push(`/calendar?seasonId=${encodeURIComponent(e.target.value)}`);
        }}
      >
        <option value={ALL_EVENTS}>All events</option>
        {events.map((e) => (
          <option key={e.seasonId} value={e.seasonId}>
            {e.groupName} · {e.name}
          </option>
        ))}
      </select>
    </label>
  );
}
