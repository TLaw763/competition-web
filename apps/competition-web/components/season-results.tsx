import Link from "next/link";
import { formatDateTime } from "../lib/bff-client";
import type { SeasonResults } from "../lib/types";

/** An event's finalised results by round, winner in bold. */
export function SeasonResultsList({
  results,
  timezone,
}: {
  results: SeasonResults;
  timezone?: string;
}) {
  return (
    <div className="space-y-4">
      {results.rounds.map((round) => (
        <div
          key={round.roundLabel}
          className="rounded-xl border bg-card text-card-foreground shadow-xs p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {round.roundLabel}
          </h3>
          <ul className="mt-2 divide-y divide-border">
            {round.fixtures.map((fixture) => {
              const aWon =
                fixture.gamesA > fixture.gamesB || fixture.outcome === "forfeitB";
              const bWon =
                fixture.gamesB > fixture.gamesA || fixture.outcome === "forfeitA";
              return (
                <li
                  key={fixture.fixtureId}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 text-sm"
                >
                  <Link
                    href={`/players/${fixture.playerA.participantId}?seasonId=${results.seasonId}`}
                    className={`truncate text-right no-underline ${aWon ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    {fixture.playerA.displayName}
                  </Link>
                  <Link
                    href={`/fixtures/${fixture.fixtureId}`}
                    className="rounded-md bg-muted px-3 py-1 text-center font-semibold tabular-nums text-foreground no-underline"
                    title={
                      fixture.confirmedStartAt
                        ? formatDateTime(fixture.confirmedStartAt, timezone)
                        : undefined
                    }
                  >
                    {fixture.outcome === "void"
                      ? "void"
                      : fixture.outcome === "doubleLoss"
                        ? "0–0 double loss"
                        : `${fixture.gamesA}–${fixture.gamesB}`}
                  </Link>
                  <Link
                    href={`/players/${fixture.playerB.participantId}?seasonId=${results.seasonId}`}
                    className={`truncate no-underline ${bWon ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    {fixture.playerB.displayName}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
