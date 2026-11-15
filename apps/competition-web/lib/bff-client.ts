import type { SeasonContext } from "./types";

export class BffError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BffError";
  }
}

/** A readable message from a failed call: the API's problem detail when there is one. */
export function errorMessage(e: unknown, fallback = "Something went wrong"): string {
  if (e instanceof BffError) {
    try {
      const body = JSON.parse(e.message) as {
        detail?: string;
        title?: string;
        message?: string;
      };
      return body.detail ?? body.message ?? body.title ?? fallback;
    } catch {
      return e.message || fallback;
    }
  }
  return e instanceof Error && e.message ? e.message : fallback;
}

export async function bffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("content-type", "application/json");
  const res = await fetch(`/api/bff${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    throw new BffError(await res.text(), res.status);
  }
  // No Content (e.g. Remove from roster): nothing to parse.
  if (res.status === 204 || res.status === 205) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loadSeasonContext(
  seasonId?: string,
): Promise<SeasonContext | null> {
  const competitions = await bffFetch<{
    items: Array<{ id: string; name: string; timezone: string }>;
  }>("/v1/competitions");

  for (const competition of competitions.items) {
    const seasons = await bffFetch<{ items: Array<{ id: string; name: string }> }>(
      `/v1/competitions/${competition.id}/seasons`,
    );
    const season = seasonId
      ? seasons.items.find((s) => s.id === seasonId)
      : seasons.items[0];
    if (season) {
      return {
        competitionId: competition.id,
        competitionName: competition.name,
        seasonId: season.id,
        seasonName: season.name,
        timezone: competition.timezone,
      };
    }
  }

  return null;
}

export function formatDateTime(iso: string, timezone?: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

/** "7 Nov 2026, 09:00 – 15:00" on one day, both dates otherwise. */
export function formatDateRange(
  startIso: string,
  endIso: string | null,
  timezone?: string,
): string {
  const start = formatDateTime(startIso, timezone);
  if (!endIso) return start;
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, timezone ? { timeZone: timezone } : {});
  const end =
    day(startIso) === day(endIso)
      ? new Date(endIso).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          ...(timezone ? { timeZone: timezone } : {}),
        })
      : formatDateTime(endIso, timezone);
  return `${start} – ${end}`;
}

export function buildResultGames(
  myWins: number,
  opponentWins: number,
  isPlayerA: boolean,
): ResultGame[] {
  const mine = isPlayerA ? "playerAWin" : "playerBWin";
  const theirs = isPlayerA ? "playerBWin" : "playerAWin";
  // The loser's games first, so the winner's last game is the one that decides
  // the match (games after that don't count).
  const winnerIsMe = myWins > opponentWins;
  const loserGames = Array<ResultGame["outcome"]>(
    winnerIsMe ? opponentWins : myWins,
  ).fill(winnerIsMe ? theirs : mine);
  const winnerGames = Array<ResultGame["outcome"]>(
    winnerIsMe ? myWins : opponentWins,
  ).fill(winnerIsMe ? mine : theirs);
  return [...loserGames, ...winnerGames].map((outcome, i) => ({
    sequence: i + 1,
    outcome,
  }));
}

export type ResultGame = {
  sequence: number;
  outcome:
    "playerAWin" | "playerBWin" | "draw" | "forfeit" | "void" | "unplayed" | "doubleLoss";
  forfeitedSide?: "A" | "B";
};

export function buildVoidGames(): ResultGame[] {
  return [
    { sequence: 1, outcome: "void" },
    { sequence: 2, outcome: "void" },
  ];
}

/** Both players lose: 0-0, no points (organisers only). */
export function buildDoubleLossGames(): ResultGame[] {
  return [{ sequence: 1, outcome: "doubleLoss" }];
}

export function buildForfeitGames(isPlayerA: boolean, iForfeit: boolean): ResultGame[] {
  const forfeitedSide: "A" | "B" = iForfeit === isPlayerA ? "A" : "B";
  return [{ sequence: 1, outcome: "forfeit", forfeitedSide }];
}

export function latestProposal(fixture: {
  scheduleProposals: Array<{ proposedStartAt: string; note?: string | null }>;
}) {
  return fixture.scheduleProposals.at(-1) ?? null;
}

export function scoreLabel(match: {
  outcome?: string | null;
  pointsPlayerA: number;
  pointsPlayerB: number;
  games: Array<{ outcome: string }>;
}): string {
  if (!match.outcome) return "No result";
  switch (match.outcome) {
    case "forfeitA":
      return "Forfeit (Player A)";
    case "forfeitB":
      return "Forfeit (Player B)";
    case "void":
      return "Void (0-0 pts)";
    case "doubleLoss":
      return "Double loss 0-0 (both lose)";
    case "draw":
      return `Draw (${match.pointsPlayerA}-${match.pointsPlayerB} pts)`;
    default: {
      const winsA = match.games.filter((g) => g.outcome === "playerAWin").length;
      const winsB = match.games.filter((g) => g.outcome === "playerBWin").length;
      return `${winsA}-${winsB} (${match.pointsPlayerA}-${match.pointsPlayerB} pts)`;
    }
  }
}
