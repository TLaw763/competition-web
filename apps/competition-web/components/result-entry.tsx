"use client";

import { buttonVariants } from "./ui/button";

import {
  buildDoubleLossGames,
  buildForfeitGames,
  buildResultGames,
  buildVoidGames,
  type ResultGame,
} from "../lib/bff-client";
import { ScoreQuickPick } from "./fixture-card";

type ResultEntryProps = {
  isPlayerA: boolean;
  disabled?: boolean;
  onSubmit: (games: ResultGame[]) => void;
  /** Organisers: buttons name the players ("Alice 2-0") instead of "Win" / "Lose". */
  playerNames?: { a: string; b: string };
};

export function ResultEntry({
  isPlayerA,
  disabled,
  onSubmit,
  playerNames,
}: ResultEntryProps) {
  const fromPlayerA = playerNames ? true : isPlayerA;
  const presets = playerNames
    ? [
        { label: `${playerNames.a} 2-0`, myWins: 2, opponentWins: 0 },
        { label: `${playerNames.a} 2-1`, myWins: 2, opponentWins: 1 },
        { label: `${playerNames.b} 2-1`, myWins: 1, opponentWins: 2 },
        { label: `${playerNames.b} 2-0`, myWins: 0, opponentWins: 2 },
      ]
    : undefined;

  return (
    <div className="space-y-3">
      <ScoreQuickPick
        disabled={disabled}
        presets={presets}
        onSelect={(myWins, opponentWins) =>
          onSubmit(buildResultGames(myWins, opponentWins, fromPlayerA))
        }
      />
      <details className="text-sm text-foreground">
        <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
          {playerNames
            ? "Other results (forfeit, void, double loss)"
            : "Other results (forfeit, void)"}
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={disabled}
            onClick={() => onSubmit(buildForfeitGames(fromPlayerA, true))}
          >
            {playerNames ? `${playerNames.a} forfeits` : "I forfeit"}
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={disabled}
            onClick={() => onSubmit(buildForfeitGames(fromPlayerA, false))}
          >
            {playerNames ? `${playerNames.b} forfeits` : "Opponent forfeit"}
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={disabled}
            onClick={() => onSubmit(buildVoidGames())}
          >
            Void match
          </button>
          {playerNames ? (
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              disabled={disabled}
              title="Both players lose: 0-0, no points and no games won"
              onClick={() => onSubmit(buildDoubleLossGames())}
            >
              Double loss (0-0)
            </button>
          ) : null}
        </div>
      </details>
    </div>
  );
}
