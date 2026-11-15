import { buttonVariants } from "../../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";
import Link from "next/link";
import { Suspense } from "react";
import { FormIndicators } from "../../../components/form-indicators";
import { MatchProgressBar } from "../../../components/match-progress-bar";
import { PlayerTabs } from "../../../components/player-tabs";
import { apiFetch } from "../../../lib/api";
import { formatDateTime } from "../../../lib/bff-client";
import { serverAuthToken } from "../../../lib/server-token";
import type {
  PlayerProfile,
  PublicPlayerOverview,
  PublicPlayerResult,
} from "../../../lib/types";

export default async function PlayerOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ participantId: string }>;
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const { participantId } = await params;
  const { seasonId } = await searchParams;
  // Signed in, a player also sees their own hidden events.
  const token = await serverAuthToken();

  // The profile joins up the player's events (R3); the overview is one event.
  let profile: PlayerProfile | null = null;
  try {
    profile = await apiFetch<PlayerProfile>(
      `/v1/public/players/${participantId}/profile`,
      { token },
    );
  } catch {
    profile = null;
  }
  const focus =
    profile?.events.find((e) => e.seasonId === seasonId) ??
    (seasonId ? null : (profile?.events.find((e) => !e.ended) ?? null));
  const focusSeasonId = focus?.seasonId ?? seasonId;
  const focusParticipantId = focus?.participantId ?? participantId;

  let player: PublicPlayerOverview | null = null;
  if (focusSeasonId) {
    try {
      player = await apiFetch<PublicPlayerOverview>(
        `/v1/public/seasons/${focusSeasonId}/participants/${focusParticipantId}`,
        { token },
      );
    } catch {
      player = null;
    }
  }

  if (!player && !profile) {
    return <PlayerError message="Player not available" />;
  }

  return (
    <section className="space-y-6">
      <Link
        href={focusSeasonId ? `/standings?seasonId=${focusSeasonId}` : "/standings"}
        className="text-sm font-medium"
      >
        ← Back to the event
      </Link>

      <Suspense fallback={null}>
        <PlayerTabs
          comp={player ? <EventOverview player={player} /> : null}
          profile={
            profile ? (
              <>
                <ProfileHeader profile={profile} />
                <CareerSection profile={profile} />
              </>
            ) : null
          }
          ownerIds={[
            participantId,
            focusParticipantId,
            ...(profile?.events.map((e) => e.participantId) ?? []),
          ]}
        />
      </Suspense>
    </section>
  );
}

function EventOverview({ player }: { player: PublicPlayerOverview }) {
  const totalMatches = player.standing.scheduledMatches ?? 0;
  return (
    <>
      <header className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden p-0">
        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex items-center gap-4 p-6 sm:p-8">
            <div
              className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-foreground sm:size-20"
              aria-hidden="true"
            >
              {initials(player.displayName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {player.competitionName} · {player.seasonName}
              </p>
              <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-foreground">
                {player.displayName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Master Duel: {player.onlineClientUsername ?? "Not provided"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border bg-muted px-6 py-5 md:block md:border-l md:border-t-0 md:px-7 md:py-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Table position
            </p>
            <p className="text-4xl font-semibold tabular-nums text-foreground md:mt-2">
              #{player.standing.rank}
            </p>
            <p className="hidden text-sm text-muted-foreground md:mt-3 md:block">
              {player.standing.matchPoints} pts
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="space-y-4">
          <NextMatchCard player={player} />
          <RecentFormCard player={player} />
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border bg-card text-card-foreground shadow-xs p-5">
            <h2 className="text-lg font-semibold text-foreground">Season progress</h2>
            <div className="mt-4">
              <MatchProgressBar
                played={player.standing.matchesPlayed}
                total={totalMatches}
              />
            </div>
            <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
              <Stat label="P" value={player.standing.matchesPlayed} />
              <Stat label="W" value={player.standing.matchesWon} tone="success" />
              <Stat label="L" value={player.standing.matchesLost} tone="danger" />
              <Stat
                label="Win %"
                value={winPercent(
                  player.standing.matchesWon,
                  player.standing.matchesPlayed,
                )}
              />
            </dl>
          </section>
          {player.tableAround && player.tableAround.length > 1 ? (
            <TableAround player={player} />
          ) : null}
          <DeckPlaceholder
            title="Last deck used"
            body="The most recently revealed deck will appear here when deck tracking is available."
          />
          <DeckPlaceholder
            title="Top performing deck"
            body="Deck performance and win rate will appear here once enough deck data has been collected."
          />
        </aside>
      </div>
    </>
  );
}

function ProfileHeader({ profile }: { profile: PlayerProfile }) {
  return (
    <header className="rounded-xl border bg-card text-card-foreground shadow-xs flex items-center gap-4 p-6 sm:p-8">
      <div
        className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-foreground sm:size-20"
        aria-hidden="true"
      >
        {initials(profile.displayName)}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
          {profile.displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Master Duel: {profile.onlineClientUsername ?? "Not provided"}
        </p>
      </div>
    </header>
  );
}

/** Career across all public events: record, titles, form, and results per event (R3). */
function CareerSection({ profile }: { profile: PlayerProfile }) {
  const { record } = profile;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Career</h2>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="rounded-xl border bg-card text-card-foreground shadow-xs p-5">
          <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
            <Stat label="Events" value={record.events} />
            <Stat label="Titles" value={record.titles} tone="success" />
            <Stat label="P" value={record.matchesPlayed} />
            <Stat label="W" value={record.won} tone="success" />
            <Stat label="L" value={record.lost} tone="danger" />
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">
            Games {record.gamesWon}–{record.gamesLost} · {record.points} pts
          </p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Form, all events
            </p>
            <FormIndicators results={[...profile.form].reverse()} />
          </div>
          {profile.upcoming.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {profile.upcoming.map((fixture) => (
                <li key={fixture.fixtureId}>
                  <span className="text-muted-foreground">
                    {formatDateTime(fixture.confirmedStartAt)}
                  </span>{" "}
                  vs{" "}
                  <Link
                    href={`/players/${fixture.opponent.participantId}`}
                    className="font-medium"
                  >
                    {fixture.opponent.displayName}
                  </Link>{" "}
                  <span className="text-muted-foreground">({fixture.seasonName})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming confirmed matches.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {profile.events.map((event) => (
          <details
            key={event.seasonId}
            className="rounded-xl border bg-card text-card-foreground shadow-xs p-4"
            open={!event.ended}
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                {event.champion ? "🏆 " : ""}
                {event.competitionName} · {event.seasonName}
              </span>
              <span className="text-sm text-muted-foreground">
                {event.rank ? `#${event.rank} of ${event.playerCount}` : "Not ranked"} ·{" "}
                {event.points} pts · {event.ended ? "Ended" : "In progress"}
              </span>
            </summary>
            {event.results.length > 0 ? (
              <ul className="mt-3 divide-y divide-border">
                {event.results.map((result) => (
                  <RecentResult
                    key={result.fixtureId}
                    result={result}
                    seasonId={event.seasonId}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No finalised matches.</p>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}

function NextMatchCard({ player }: { player: PublicPlayerOverview }) {
  const fixture = player.nextFixture;
  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Next match
      </p>
      {fixture ? (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{fixture.roundLabel}</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">
              vs{" "}
              <Link
                href={`/players/${fixture.opponent.participantId}?seasonId=${player.seasonId}`}
                className="text-foreground no-underline hover:text-muted-foreground"
              >
                {fixture.opponent.displayName}
              </Link>
            </h2>
            {fixture.opponent.onlineClientUsername ? (
              <p className="text-sm text-muted-foreground">
                {fixture.opponent.onlineClientUsername}
              </p>
            ) : null}
            <p className="mt-3 text-sm font-medium text-foreground">
              {formatDateTime(fixture.confirmedStartAt)}
            </p>
          </div>
          <Link
            href={`/fixtures/${fixture.fixtureId}`}
            className={buttonVariants({ variant: "outline", className: "no-underline" })}
          >
            Match details
          </Link>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No upcoming confirmed fixture.
        </p>
      )}
    </section>
  );
}

function RecentFormCard({ player }: { player: PublicPlayerOverview }) {
  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Player form
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Last 5 matches</h2>
        </div>
        <FormIndicators results={player.standing.recentForm} />
      </div>

      {player.recentResults.length > 0 ? (
        <ul className="mt-5 divide-y divide-border">
          {player.recentResults.map((result) => (
            <RecentResult
              key={result.fixtureId}
              result={result}
              seasonId={player.seasonId}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No finalized matches yet.</p>
      )}
    </section>
  );
}

function RecentResult({
  result,
  seasonId,
}: {
  result: PublicPlayerResult;
  seasonId: string;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
      <FormIndicators results={[result.result]} chronological={false} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{result.roundLabel}</p>
        <Link
          href={`/players/${result.opponent.participantId}?seasonId=${seasonId}`}
          className="font-semibold text-foreground no-underline hover:text-muted-foreground"
        >
          {result.opponent.displayName}
        </Link>
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums text-foreground">
          {result.gamesWon}–{result.gamesLost}
        </p>
        <Link
          href={`/fixtures/${result.fixtureId}`}
          className="text-xs text-muted-foreground hover:text-muted-foreground"
        >
          {result.confirmedStartAt
            ? new Date(result.confirmedStartAt).toLocaleDateString()
            : result.roundLabel}
        </Link>
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "success" | "warning" | "danger";
}) {
  const toneClass = tone
    ? {
        success: "text-success",
        warning: "text-warning",
        danger: "text-danger",
      }[tone]
    : "text-foreground";
  return (
    <div className="rounded-md bg-muted px-2 py-3">
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</dd>
    </div>
  );
}

/** Matches won of matches played, as in the table (a bye is a win, a double loss a loss). */
function winPercent(won: number, played: number): string {
  return played === 0 ? "–" : `${Math.round((won / played) * 100)}%`;
}

function DeckPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Deck data
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 rounded-md border border-dashed border-input bg-muted p-4">
        <p className="text-sm text-muted-foreground">{body}</p>
        <span className="mt-3 inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Coming soon
        </span>
      </div>
    </section>
  );
}

/** Where the player sits: the rows just above and below them. */
function TableAround({ player }: { player: PublicPlayerOverview }) {
  const rows = player.tableAround ?? [];
  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs p-5">
      <h2 className="text-lg font-semibold text-foreground">
        Table around {player.displayName}
      </h2>
      <table className="mt-3 w-full text-left text-sm">
        <caption className="sr-only">
          Players ranked just above and below {player.displayName}
        </caption>
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="py-1 pr-2 font-medium">
              Pos
            </th>
            <th scope="col" className="py-1 pr-2 font-medium">
              Player
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              P
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              Pts
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const me = row.participantId === player.participantId;
            return (
              <tr
                key={row.participantId}
                className={me ? "bg-accent font-semibold" : undefined}
                aria-current={me ? "true" : undefined}
              >
                <td className="py-1.5 pl-1 pr-2 tabular-nums">{row.rank}</td>
                <td className="max-w-0 truncate py-1.5 pr-2">
                  {me ? (
                    row.displayName
                  ) : (
                    <Link
                      href={`/players/${row.participantId}?seasonId=${player.seasonId}`}
                      className="text-foreground no-underline hover:text-muted-foreground"
                    >
                      {row.displayName}
                    </Link>
                  )}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                  {row.matchesPlayed}
                </td>
                <td className="py-1.5 pr-1 text-right tabular-nums">{row.matchPoints}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function PlayerError({ message }: { message: string }) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Player overview
      </h1>
      <p
        className={cn(
          "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
          "text-sm",
        )}
        role="alert"
      >
        {message}
      </p>
      <Link href="/standings" className="text-sm font-medium">
        ← Back to standings
      </Link>
    </section>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
