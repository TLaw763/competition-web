"use client";

import { buttonVariants } from "./ui/button";

import { FixtureStateBadge } from "./site-chrome";
import { formatDateTime, latestProposal, scoreLabel } from "../lib/bff-client";
import { isFixtureClosed } from "../lib/fixture-states";
import type { FixtureView } from "../lib/types";
import { formatMasterDuelId } from "../lib/games";

type FixtureCardProps = {
  fixture: FixtureView;
  timezone?: string;
  children?: React.ReactNode;
  /** Anchor id, e.g. for links from the organiser's approvals list. */
  id?: string;
  /** The small line above the players; the round's label by default. */
  eyebrow?: string;
};

export function FixtureCard({
  fixture,
  timezone,
  children,
  id,
  eyebrow,
}: FixtureCardProps) {
  const title =
    fixture.participantADisplayName && fixture.participantBDisplayName
      ? `${fixture.participantADisplayName} vs ${fixture.participantBDisplayName}`
      : `vs ${fixture.opponentDisplayName ?? "TBD"}`;

  return (
    <li
      id={id}
      className="rounded-xl border bg-card text-card-foreground shadow-xs scroll-mt-4 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow ?? fixture.roundLabel ?? "Fixture"}
          </p>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {fixture.opponentMasterDuelId ? (
            <p className="text-sm text-muted-foreground">
              {fixture.opponentDisplayName ?? "Opponent"}&apos;s Master Duel ID{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatMasterDuelId(fixture.opponentMasterDuelId)}
              </span>
            </p>
          ) : null}
        </div>
        <FixtureStateBadge state={fixture.state} />
      </div>

      {fixture.confirmedStartAt ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Confirmed: {formatDateTime(fixture.confirmedStartAt, timezone)}
        </p>
      ) : latestProposal(fixture) ? (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-warning">
            Latest proposal:{" "}
            {formatDateTime(latestProposal(fixture)!.proposedStartAt, timezone)}
          </p>
          {latestProposal(fixture)!.note ? (
            <p className="text-muted-foreground">Note: {latestProposal(fixture)!.note}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No schedule confirmed yet.
          {fixture.suggestedStartAt ? (
            <>
              {" "}
              Suggested start:{" "}
              <strong className="text-foreground">
                {formatDateTime(fixture.suggestedStartAt, timezone ?? fixture.timezone)}
              </strong>
              .
            </>
          ) : null}
        </p>
      )}

      {fixture.state === "cancelled" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          This match was cancelled and will not count toward standings.
        </p>
      ) : fixture.matches.some((m) => m.outcome) ? (
        <p className="mt-2 text-sm text-foreground">
          Result:{" "}
          {scoreLabel(fixture.matches.find((m) => m.outcome) ?? fixture.matches[0]!)}
          {!isFixtureClosed(fixture.state) ? (
            <span className="text-muted-foreground"> · pending confirmation</span>
          ) : null}
        </p>
      ) : null}

      {children ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">{children}</div>
      ) : null}
    </li>
  );
}

const PLAYER_PRESETS = [
  { label: "Win 2-0", myWins: 2, opponentWins: 0 },
  { label: "Win 2-1", myWins: 2, opponentWins: 1 },
  { label: "Lose 1-2", myWins: 1, opponentWins: 2 },
  { label: "Lose 0-2", myWins: 0, opponentWins: 2 },
];

export function ScoreQuickPick({
  onSelect,
  disabled,
  presets = PLAYER_PRESETS,
}: {
  onSelect: (myWins: number, opponentWins: number) => void;
  disabled?: boolean;
  presets?: Array<{ label: string; myWins: number; opponentWins: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          disabled={disabled}
          className={buttonVariants({ variant: "outline" })}
          onClick={() => onSelect(preset.myWins, preset.opponentWins)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
