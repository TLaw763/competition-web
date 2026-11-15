"use client";

import { buttonVariants } from "./ui/button";

import Link from "next/link";
import { useState } from "react";
import { formatDateTime } from "../lib/bff-client";
import type { PublicSeasonFixtures } from "../lib/types";

type Round = PublicSeasonFixtures["rounds"][number];

const DONE = new Set(["finalized", "cancelled"]);

function scheduling(round: Round): { label: string; tone: string } {
  const open = round.fixtures.filter((f) => !DONE.has(f.state));
  if (round.fixtures.length > 0 && open.length === 0) {
    return { label: "Played", tone: "bg-success-soft text-success" };
  }
  const timed = open.filter((f) => f.confirmedStartAt).length;
  if (timed === 0)
    return { label: "Not scheduled", tone: "bg-muted text-muted-foreground" };
  if (timed < open.length)
    return { label: "Partly scheduled", tone: "bg-warning-soft text-warning" };
  return { label: "Scheduled", tone: "bg-info-soft text-info" };
}

/** Timed matches newest first, then the untimed ones in their round order. */
function latestFirst(fixtures: Round["fixtures"]): Round["fixtures"] {
  const timed = fixtures
    .filter((f) => f.confirmedStartAt)
    .sort((a, b) => b.confirmedStartAt!.localeCompare(a.confirmedStartAt!));
  return [...timed, ...fixtures.filter((f) => !f.confirmedStartAt)];
}

type Show = "toPlay" | "played";

/**
 * An event's matches by round. "To play" (the default) lists only the matches
 * still outstanding; "Played" has the finished (and cancelled) ones.
 */
export function EventFixtures({
  data,
  timezone,
  seasonId,
  calendarHref,
}: {
  data: PublicSeasonFixtures;
  timezone: string;
  seasonId: string;
  /** The event page's Calendar tab. */
  calendarHref: string;
}) {
  const [show, setShow] = useState<Show>("toPlay");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (data.rounds.length === 0) {
    return (
      <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
        No matches yet.
      </p>
    );
  }
  const pick = (played: boolean) =>
    data.rounds
      .map((round) => ({
        ...round,
        fixtures: round.fixtures.filter((f) => DONE.has(f.state) === played),
        // A bye belongs with the round's outstanding matches.
        bye: played ? null : round.bye,
      }))
      .filter((round) => round.fixtures.length > 0 || round.bye);
  const toPlay = pick(false);
  // Most recent first: last round on top, the latest match first within it.
  const played = pick(true)
    .reverse()
    .map((round) => ({ ...round, fixtures: latestFirst(round.fixtures) }));
  const count = (rounds: Round[]) => rounds.reduce((n, r) => n + r.fixtures.length, 0);
  const rounds = show === "toPlay" ? toPlay : played;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show matches">
        {(
          [
            ["toPlay", `To play (${count(toPlay)})`],
            ["played", `Played (${count(played)})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={show === id}
            className={buttonVariants({ variant: show === id ? "default" : "outline" })}
            onClick={() => setShow(id)}
          >
            {label}
          </button>
        ))}
        <Link
          href={calendarHref}
          scroll={false}
          className={buttonVariants({
            variant: "outline",
            className: "ml-auto no-underline",
          })}
        >
          Calendar
        </Link>
      </div>
      {rounds.length === 0 ? (
        <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          {show === "toPlay" ? "Every match has been played." : "No matches played yet."}
        </p>
      ) : null}
      {rounds.map((round) => {
        const status =
          show === "toPlay"
            ? scheduling(round)
            : { label: "Played", tone: "bg-success-soft text-success" };
        // Open to start: the next round to play, and rounds with a match booked.
        const key = `${show}:${round.roundId}`;
        const isOpen =
          open[key] ??
          (show === "toPlay" &&
            (round.roundId === toPlay[0]?.roundId ||
              round.fixtures.some((f) => f.confirmedStartAt)));
        return (
          <details
            key={key}
            className="rounded-xl border bg-card text-card-foreground shadow-xs"
            open={isOpen}
            onToggle={(e) => {
              const next = (e.currentTarget as HTMLDetailsElement).open;
              if (next !== isOpen) setOpen((prev) => ({ ...prev, [key]: next }));
            }}
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <span className="font-semibold text-foreground">{round.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${status.tone}`}>
                {status.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {round.fixtures.length} match{round.fixtures.length === 1 ? "" : "es"}
              </span>
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {round.fixtures.map((f) => {
                const cancelled = f.state === "cancelled";
                const name = (side: "A" | "B") => {
                  const player = side === "A" ? f.playerA : f.playerB;
                  const won = f.score?.winner === side;
                  return (
                    <Link
                      href={`/players/${player.participantId}?seasonId=${seasonId}`}
                      className={`no-underline hover:text-muted-foreground ${
                        won
                          ? "font-semibold text-foreground"
                          : f.score
                            ? "text-muted-foreground"
                            : "text-foreground"
                      }`}
                    >
                      {player.displayName}
                    </Link>
                  );
                };
                return (
                  <li
                    key={f.fixtureId}
                    className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 text-sm ${
                      cancelled ? "opacity-60" : ""
                    }`}
                  >
                    <span className="min-w-0 truncate text-right">{name("A")}</span>
                    <span className="min-w-16 rounded-md bg-muted px-2 py-0.5 text-center tabular-nums">
                      {f.score ? `${f.score.gamesA}–${f.score.gamesB}` : "vs"}
                    </span>
                    <span className="min-w-0 truncate">{name("B")}</span>
                    <span className="col-span-3 text-center text-xs text-muted-foreground">
                      {cancelled
                        ? "Cancelled"
                        : f.state === "postponed"
                          ? "Postponed"
                          : f.score?.doubleLoss
                            ? "Double loss"
                            : f.confirmedStartAt
                              ? formatDateTime(f.confirmedStartAt, timezone)
                              : f.score
                                ? "Played"
                                : "Time not set yet"}
                    </span>
                  </li>
                );
              })}
              {round.bye ? (
                <li className="px-4 py-2 text-center text-xs text-muted-foreground">
                  Bye: {round.bye.displayName}
                </li>
              ) : null}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
