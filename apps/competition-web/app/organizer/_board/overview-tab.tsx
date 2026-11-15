"use client";

import { buttonVariants } from "../../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import type { Board } from "./use-board";

/** Overview: what needs the organiser now, and the event's main actions. */
export function OverviewTab({ board }: { board: Board }) {
  const {
    ctx,
    busy,
    groupId,
    isMain,
    approvals,
    ended,
    access,
    completeEvent,
    reopenEvent,
    rebuildStandings,
    fixtures,
    rosterPlayers,
    select,
  } = board;
  const done = fixtures.filter(
    (f) => f.state === "finalized" || f.state === "cancelled",
  ).length;
  const rounds = new Set(fixtures.map((f) => f.roundId)).size;
  const untimed = fixtures.filter(
    (f) => !f.confirmedStartAt && f.state !== "finalized" && f.state !== "cancelled",
  ).length;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {isMain && groupId ? (
          <Link
            href={`/organizer/create?groupId=${groupId}`}
            className={buttonVariants({ className: "no-underline" })}
          >
            Create event
          </Link>
        ) : null}
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          disabled={busy || !ctx}
          onClick={() => void rebuildStandings()}
        >
          Rebuild standings
        </button>
        <Link
          href={ctx ? `/standings?seasonId=${ctx.seasonId}` : "/standings"}
          className={buttonVariants({ variant: "outline", className: "no-underline" })}
        >
          Event page
        </Link>
        {ctx && isMain && !ended ? (
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy || approvals.some((a) => a.kind !== "date")}
            title={
              approvals.some((a) => a.kind !== "date")
                ? "Finalise the waiting results first"
                : undefined
            }
            onClick={() => void completeEvent()}
          >
            Complete event
          </button>
        ) : null}
        {ctx && ended && access?.platformAdmin ? (
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy}
            onClick={() => void reopenEvent()}
          >
            Reopen event
          </button>
        ) : null}
      </div>

      {ended ? (
        <p
          className={cn(
            "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
            "text-sm",
          )}
        >
          This event has ended: its table is final and nothing can change.{" "}
          <Link href="/?tab=past" className="font-medium">
            Past events →
          </Link>
        </p>
      ) : null}

      {!ctx ? (
        <div
          className={cn(
            "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
            "text-sm",
          )}
        >
          No events in this group yet.
          {isMain
            ? " Use Create event to set one up."
            : " The main organiser creates events."}
        </div>
      ) : null}

      {ctx ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Players",
              value: rosterPlayers.length,
              tab: isMain ? "roster" : null,
            },
            { label: "Rounds", value: rounds, tab: "rounds" },
            { label: "Matches done", value: `${done}/${fixtures.length}`, tab: "rounds" },
            { label: "Still without a time", value: untimed, tab: "schedule" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="text-xl font-semibold tabular-nums text-foreground">
                {stat.tab ? (
                  <button
                    type="button"
                    className="hover:text-muted-foreground"
                    onClick={() =>
                      select({ tab: stat.tab as "roster" | "rounds" | "schedule" })
                    }
                  >
                    {stat.value}
                  </button>
                ) : (
                  stat.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {ctx ? (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Needs you</h2>
            <p className="text-sm text-muted-foreground">
              Players agree times and results between them; nothing is public or counts
              until you confirm it here.
            </p>
          </div>
          {approvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {approvals.map((item) => (
                <li
                  key={item.fixture.id}
                  className="rounded-lg border bg-muted/50 flex flex-wrap items-center justify-between gap-2 p-3"
                >
                  <span
                    className={
                      item.kind === "dispute" ? "text-warning" : "text-foreground"
                    }
                  >
                    {item.label}
                  </span>
                  <Link
                    href={`/organizer?groupId=${groupId}&seasonId=${ctx.seasonId}&tab=rounds#fixture-${item.fixture.id}`}
                    scroll={false}
                    className="font-medium"
                  >
                    Review →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </>
  );
}
