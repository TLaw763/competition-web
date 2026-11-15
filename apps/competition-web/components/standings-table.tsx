import Link from "next/link";
import { FormIndicators } from "./form-indicators";
import { MatchProgressBar } from "./match-progress-bar";
import type { StandingRow } from "../lib/types";

function rankColorClass(rank: number): string {
  if (rank === 1) return "text-warning";
  if (rank === 2) return "text-muted-foreground";
  if (rank === 3) return "text-rank-bronze";
  return "text-muted-foreground/70";
}

type StandingsTableProps = {
  rows: StandingRow[];
  /** Swiss: OMW% / OOMW% columns, and progress counted against the Swiss rounds. */
  swissRounds?: number;
};

function pct(value: number | undefined): string {
  return `${((value ?? 0) * 100).toFixed(1)}%`;
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-md bg-muted px-2 py-1 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${tone ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function StandingsMobileCards({ rows, swissRounds }: StandingsTableProps) {
  return (
    <ul className="space-y-3 md:hidden" aria-label="Standings">
      {rows.map((row) => {
        const total = swissRounds ?? row.scheduledMatches ?? 0;
        const gameDifference = row.gamesWon - row.gamesLost;
        return (
          <li
            key={row.participantId}
            className="rounded-xl border bg-card text-card-foreground shadow-xs p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={`text-xl font-semibold tabular-nums ${rankColorClass(row.rank)}`}
                  aria-label={`Position ${row.rank}`}
                >
                  {row.rank}
                </span>
                <div>
                  <Link
                    href={`/players/${row.participantId}?seasonId=${row.seasonId}`}
                    className="font-semibold text-foreground no-underline hover:text-muted-foreground"
                  >
                    {row.displayName ?? row.participantId}
                  </Link>
                  {row.onlineClientUsername ? (
                    <span className="block text-xs text-muted-foreground">
                      {row.onlineClientUsername}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Pts
                </p>
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {row.matchPoints}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              <StatPill label="P" value={row.matchesPlayed} />
              <StatPill label="W" value={row.matchesWon} tone="text-success" />
              <StatPill label="L" value={row.matchesLost} tone="text-danger" />
              <StatPill label="GW" value={row.gamesWon} />
              <StatPill label="GL" value={row.gamesLost} />
              <StatPill
                label="GD"
                value={gameDifference}
                tone={
                  gameDifference > 0
                    ? "text-success"
                    : gameDifference < 0
                      ? "text-danger"
                      : undefined
                }
              />
            </div>
            {swissRounds ? (
              <p className="mt-2 text-xs text-muted-foreground">
                OMW {pct(row.tiebreakerValues?.opponentsMatchWinPct)} · OOMW{" "}
                {pct(row.tiebreakerValues?.opponentsOpponentsMatchWinPct)}
              </p>
            ) : null}

            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Form
              </p>
              <FormIndicators results={row.recentForm} />
              <div className="mt-2">
                <MatchProgressBar played={row.matchesPlayed} total={total} compact />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StandingsDesktopTable({ rows, swissRounds }: StandingsTableProps) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-xs hidden overflow-x-auto p-0 md:block">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">
              Pos
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Player
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-right font-medium lg:table-cell"
            >
              P
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-right font-medium sm:table-cell"
            >
              W
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-right font-medium sm:table-cell"
            >
              L
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-right font-medium lg:table-cell"
            >
              GW
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-right font-medium lg:table-cell"
            >
              GL
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-right font-medium lg:table-cell"
            >
              GD
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Pts
            </th>
            {swissRounds ? (
              <>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-right font-medium sm:table-cell"
                  title="Opponents' match-win %"
                >
                  OMW%
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-right font-medium lg:table-cell"
                  title="Opponents' opponents' match-win %"
                >
                  OOMW%
                </th>
              </>
            ) : null}
            <th scope="col" className="px-4 py-3 font-medium">
              Form
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = swissRounds ?? row.scheduledMatches ?? 0;
            const gameDifference = row.gamesWon - row.gamesLost;
            return (
              <tr
                key={row.participantId}
                className="border-b border-border/50 last:border-0 transition-colors duration-200 hover:bg-muted"
              >
                <td
                  className={`px-4 py-3 font-semibold tabular-nums ${rankColorClass(row.rank)}`}
                >
                  {row.rank}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/players/${row.participantId}?seasonId=${row.seasonId}`}
                    className="font-semibold text-foreground no-underline hover:text-muted-foreground"
                  >
                    {row.displayName ?? row.participantId}
                  </Link>
                  {row.onlineClientUsername ? (
                    <span className="block text-xs text-muted-foreground">
                      {row.onlineClientUsername}
                    </span>
                  ) : null}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground lg:table-cell">
                  {row.matchesPlayed}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-success sm:table-cell">
                  {row.matchesWon}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-danger sm:table-cell">
                  {row.matchesLost}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground lg:table-cell">
                  {row.gamesWon}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground lg:table-cell">
                  {row.gamesLost}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground lg:table-cell">
                  {gameDifference > 0 ? `+${gameDifference}` : gameDifference}
                </td>
                <td className="px-3 py-3 text-right text-base font-semibold tabular-nums text-foreground">
                  {row.matchPoints}
                </td>
                {swissRounds ? (
                  <>
                    <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {pct(row.tiebreakerValues?.opponentsMatchWinPct)}
                    </td>
                    <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground lg:table-cell">
                      {pct(row.tiebreakerValues?.opponentsOpponentsMatchWinPct)}
                    </td>
                  </>
                ) : null}
                <td className="px-4 py-3">
                  <FormIndicators results={row.recentForm} />
                  <div className="mt-2">
                    <MatchProgressBar played={row.matchesPlayed} total={total} compact />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StandingsTable({ rows, swissRounds }: StandingsTableProps) {
  return (
    <>
      <StandingsMobileCards rows={rows} swissRounds={swissRounds} />
      <StandingsDesktopTable rows={rows} swissRounds={swissRounds} />
    </>
  );
}
