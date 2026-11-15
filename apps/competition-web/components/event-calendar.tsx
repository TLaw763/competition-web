"use client";

import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useEffect, useState } from "react";
import { bffFetch, errorMessage } from "../lib/bff-client";
import type { PublicCalendarItem } from "../lib/types";
import { CalendarView } from "./calendar-view";
import { FixturesSkeleton } from "./skeleton";

/**
 * An event page's Calendar tab: the event's confirmed matches. Players of a
 * private event see it too; only public events offer the subscribe links and
 * public fixture pages.
 */
export function EventCalendar({
  seasonId,
  timezone,
  isPublic,
}: {
  seasonId: string;
  timezone: string;
  isPublic: boolean;
}) {
  const [items, setItems] = useState<PublicCalendarItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    setError(null);
    void bffFetch<{ items: PublicCalendarItem[] }>(
      `/v1/public/seasons/${seasonId}/calendar`,
    )
      .then((res) => setItems(res.items))
      .catch((e) => setError(errorMessage(e, "Couldn't load the calendar")));
  }, [seasonId]);

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
  if (!items) return <FixturesSkeleton />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Confirmed times only, shown in {timezone}.
        {isPublic ? null : (
          <>
            {" "}
            This event is private: add your own matches to your calendar app from{" "}
            <Link href="/account" className="font-medium">
              Account
            </Link>
            .
          </>
        )}
      </p>
      {items.length === 0 ? (
        <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          No confirmed match times yet. They appear here once an organiser confirms them.
        </p>
      ) : (
        <CalendarView
          items={items}
          timezone={timezone}
          seasonId={seasonId}
          icsUrl={
            isPublic
              ? `/api/bff/v1/public/calendar.ics?seasonId=${encodeURIComponent(seasonId)}`
              : undefined
          }
          fixtureLinks={isPublic}
        />
      )}
    </div>
  );
}
