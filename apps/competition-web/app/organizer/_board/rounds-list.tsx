"use client";

import { buttonVariants } from "../../../components/ui/button";

import { useEffect, useMemo, useState } from "react";
import type { FixtureView } from "../../../lib/types";
import { OrganiserFixture } from "./fixture-controls";
import type { Board } from "./use-board";

type RoundGroup = {
  roundId: string;
  label: string;
  fixtures: FixtureView[];
  done: number;
  timed: number;
  waiting: number;
};

const DONE = new Set(["finalized", "cancelled"]);

/** Fixtures in round order (as the API lists them), one group per round. */
export function groupByRound(fixtures: FixtureView[]): RoundGroup[] {
  const groups = new Map<string, RoundGroup>();
  for (const fixture of fixtures) {
    let group = groups.get(fixture.roundId);
    if (!group) {
      group = {
        roundId: fixture.roundId,
        label: fixture.roundLabel ?? "Round",
        fixtures: [],
        done: 0,
        timed: 0,
        waiting: 0,
      };
      groups.set(fixture.roundId, group);
    }
    group.fixtures.push(fixture);
    if (DONE.has(fixture.state)) group.done += 1;
    if (fixture.confirmedStartAt) group.timed += 1;
    const result = fixture.resultSubmission?.state;
    if (result === "submitted" || result === "confirmed" || result === "disputed") {
      group.waiting += 1;
    }
  }
  return [...groups.values()];
}

type Show = "upcoming" | "past";

/** Finished first: the latest match first (untimed ones after, in round order). */
function latestFirst(fixtures: FixtureView[]): FixtureView[] {
  const timed = fixtures
    .filter((f) => f.confirmedStartAt)
    .sort((a, b) => b.confirmedStartAt!.localeCompare(a.confirmedStartAt!));
  return [...timed, ...fixtures.filter((f) => !f.confirmedStartAt)];
}

/**
 * Every match, in collapsible rounds with a short status for each. Upcoming
 * (still to play or settle, oldest round first, open) or Past (finalised or
 * cancelled, newest round first, closed).
 */
export function RoundsList({ board }: { board: Board }) {
  const { fixtures } = board;
  const [show, setShow] = useState<Show>("upcoming");
  const upcoming = useMemo(
    () => groupByRound(fixtures.filter((f) => !DONE.has(f.state))),
    [fixtures],
  );
  const past = useMemo(
    () =>
      groupByRound(fixtures.filter((f) => DONE.has(f.state)))
        .reverse()
        .map((g) => ({ ...g, fixtures: latestFirst(g.fixtures) })),
    [fixtures],
  );
  const groups = show === "upcoming" ? upcoming : past;
  // Round headers describe the whole round, whichever view it's shown in.
  const whole = useMemo(
    () => new Map(groupByRound(fixtures).map((g) => [g.roundId, g])),
    [fixtures],
  );
  // Keyed by view and round: a round can be in both (some matches done).
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const keyOf = (roundId: string) => `${show}:${roundId}`;

  // A link to one match ("Review →" on Overview) opens its tab and round, then scrolls to it.
  useEffect(() => {
    const target = window.location.hash.match(/^#fixture-(.+)$/)?.[1];
    if (!target) return;
    const fixture = fixtures.find((f) => f.id === target);
    if (!fixture) return;
    const view: Show = DONE.has(fixture.state) ? "past" : "upcoming";
    setShow(view);
    setOpen((prev) => ({ ...prev, [`${view}:${fixture.roundId}`]: true }));
    requestAnimationFrame(() =>
      document.getElementById(`fixture-${target}`)?.scrollIntoView({ block: "start" }),
    );
  }, [fixtures]);

  if (fixtures.length === 0) {
    return <p className="text-sm text-muted-foreground">No matches yet.</p>;
  }

  const count = (list: RoundGroup[]) => list.reduce((n, g) => n + g.fixtures.length, 0);

  return (
    <section className="space-y-3" aria-label="Matches by round">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Matches</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show matches">
          {(
            [
              ["upcoming", `Upcoming (${count(upcoming)})`],
              ["past", `Past (${count(past)})`],
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
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={buttonVariants({
              variant: "outline",
              className: "px-2 py-0.5 text-xs",
            })}
            onClick={() =>
              setOpen((prev) => ({
                ...prev,
                ...Object.fromEntries(groups.map((g) => [keyOf(g.roundId), true])),
              }))
            }
          >
            Open all
          </button>
          <button
            type="button"
            className={buttonVariants({
              variant: "outline",
              className: "px-2 py-0.5 text-xs",
            })}
            onClick={() =>
              setOpen((prev) => ({
                ...prev,
                ...Object.fromEntries(groups.map((g) => [keyOf(g.roundId), false])),
              }))
            }
          >
            Close all
          </button>
        </div>
      </div>
      {groups.length === 0 ? (
        <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          {show === "upcoming"
            ? "Every match is finalised. They're under Past."
            : "No matches finalised yet."}
        </p>
      ) : null}
      {groups.map((group) => {
        const key = keyOf(group.roundId);
        const isOpen = open[key] ?? show === "upcoming";
        const round = whole.get(group.roundId) ?? group;
        const total = round.fixtures.length;
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
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
              <span className="font-semibold text-foreground">{group.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  round.done === total
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {round.done}/{total} done
              </span>
              <span className="text-xs text-muted-foreground">
                {round.timed === total
                  ? "all timed"
                  : round.timed === 0
                    ? "no times yet"
                    : `${round.timed}/${total} timed`}
              </span>
              {round.waiting ? (
                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
                  {round.waiting} result{round.waiting === 1 ? "" : "s"} waiting
                </span>
              ) : null}
            </summary>
            {isOpen ? (
              <ul className="space-y-4 border-t border-border p-4">
                {group.fixtures.map((fixture) => (
                  <OrganiserFixture key={fixture.id} board={board} fixture={fixture} />
                ))}
              </ul>
            ) : null}
          </details>
        );
      })}
    </section>
  );
}
