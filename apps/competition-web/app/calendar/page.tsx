import { cn } from "@enigmic-co/ui/cn";
import Link from "next/link";
import { ALL_EVENTS, CalendarEventPicker } from "../../components/calendar-event-picker";
import { CalendarView } from "../../components/calendar-view";
import { apiFetch, publicLoadError } from "../../lib/api";
import { DEV_TOOLS } from "../../lib/dev-tools";
import type { EventCard, PublicCalendarItem } from "../../lib/types";

type CalendarResponse = {
  items: PublicCalendarItem[];
};

/**
 * The public calendar of one event (?seasonId=…), or of every public event.
 * With no event in the link, the picker opens the one last viewed.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const { seasonId: asked } = await searchParams;
  let items: PublicCalendarItem[] = [];
  let events: EventCard[] = [];
  let error: string | null = null;

  try {
    // Only public events have a public calendar.
    events = (await apiFetch<{ items: EventCard[] }>("/v1/public/events")).items.filter(
      (e) => !e.private,
    );
  } catch (e) {
    error = publicLoadError("events", e);
  }
  const event = events.find((e) => e.seasonId === asked) ?? null;
  const seasonId = event?.seasonId;
  const timezone = event?.timezone ?? events[0]?.timezone;

  if (!error) {
    try {
      const query = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : "";
      items = (await apiFetch<CalendarResponse>(`/v1/public/calendar${query}`)).items;
    } catch (e) {
      error = publicLoadError("the calendar", e);
    }
  }

  // Through competition-web's proxy: competition-api isn't reachable from browsers.
  const icsUrl = `/api/bff/v1/public/calendar.ics${
    seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : ""
  }`;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Public calendar
        </h1>
        <p className="text-sm text-muted-foreground">
          {event ? `${event.groupName} · ${event.name}. ` : "All public events. "}
          Confirmed fixtures only. Provisional schedules are excluded.
          {timezone ? ` Times shown in ${timezone}.` : null}
        </p>
      </div>
      <CalendarEventPicker
        events={events}
        seasonId={seasonId ?? null}
        chosen={Boolean(asked) && (Boolean(event) || asked === ALL_EVENTS)}
      />
      {error ? (
        <p
          className={cn(
            "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
            "text-sm",
          )}
          role="alert"
        >
          {error}.
          {DEV_TOOLS ? (
            <>
              {" "}
              Start the API with <code>pnpm --filter @enigmic/competition-api dev</code>.
            </>
          ) : null}
        </p>
      ) : null}
      {items.length === 0 && !error ? (
        <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm text-muted-foreground">
          <p>No confirmed fixtures yet.</p>
          <p>
            Fixtures appear here once the organizer confirms their times on the{" "}
            <Link href="/organizer" className="font-medium">
              organizer board
            </Link>
            .
          </p>
        </div>
      ) : (
        <CalendarView
          // A new event starts the view afresh (month, list, open days).
          key={seasonId ?? ALL_EVENTS}
          items={items}
          timezone={timezone}
          seasonId={seasonId}
          icsUrl={icsUrl}
        />
      )}
    </section>
  );
}
