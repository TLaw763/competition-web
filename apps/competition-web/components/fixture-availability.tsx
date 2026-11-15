"use client";

import { buttonVariants } from "./ui/button";

import { useEffect, useState } from "react";
import { bffFetch } from "../lib/bff-client";
import { slotLabel } from "../lib/availability";
import type { FixtureAvailability as FixtureAvailabilityView } from "../lib/types";

/**
 * Both players' weekly availability and when they're both free this week (R2),
 * next to a date picker. `onPick` gets the start of a shared free time.
 */
export function FixtureAvailability({
  fixtureId,
  onPick,
}: {
  fixtureId: string;
  onPick?: (startUtc: string) => void;
}) {
  const [data, setData] = useState<FixtureAvailabilityView | null>(null);

  useEffect(() => {
    let cancelled = false;
    void bffFetch<FixtureAvailabilityView>(`/v1/fixtures/${fixtureId}/availability`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  if (!data) return null;

  return (
    <div className="rounded-lg border bg-muted/50 space-y-2 p-3 text-sm">
      {data.bothFree.length > 0 ? (
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            Both free in the next 7 days ({data.timezone})
          </p>
          <ul className="flex flex-wrap gap-2">
            {data.bothFree.map((slot) => (
              <li key={slot.startUtc}>
                {onPick ? (
                  <button
                    type="button"
                    className={buttonVariants({ variant: "outline" })}
                    onClick={() => onPick(slot.startUtc)}
                    title="Use the start of this time"
                  >
                    {slotLabel(slot)}
                  </button>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {slotLabel(slot)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : data.players.every((p) => p.availability) ? (
        <p className="text-muted-foreground">No shared free time in the next 7 days.</p>
      ) : null}
      <ul className="space-y-1 text-muted-foreground">
        {data.players.map((player) => (
          <li key={player.side}>
            <span className="text-foreground">{player.displayName}:</span>{" "}
            {player.availability && player.availability.slots.length > 0
              ? `${player.availability.slots.map(slotLabel).join(", ")} (${player.availability.timezone})`
              : "hasn't shared their availability"}
            {player.availability?.note ? ` — “${player.availability.note}”` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
