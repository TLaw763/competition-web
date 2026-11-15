"use client";

import { buttonVariants } from "./ui/button";

export type ManualPairingDraft = {
  participantAId: string;
  participantBId: string;
};

export type ManualRoundDraft = {
  sequence: number;
  pairings: ManualPairingDraft[];
};

type ParticipantOption = {
  id: string;
  displayName: string;
};

type ManualFixtureBuilderProps = {
  participants: ParticipantOption[];
  rounds: ManualRoundDraft[];
  onChange: (rounds: ManualRoundDraft[]) => void;
};

export function manualPairingsPayload(rounds: ManualRoundDraft[]) {
  return rounds.flatMap((round) =>
    round.pairings
      .filter((pairing) => pairing.participantAId && pairing.participantBId)
      .map((pairing) => ({
        roundSequence: round.sequence,
        participantAId: pairing.participantAId,
        participantBId: pairing.participantBId,
      })),
  );
}

export function emptyManualRound(sequence: number): ManualRoundDraft {
  return { sequence, pairings: [{ participantAId: "", participantBId: "" }] };
}

export function ManualFixtureBuilder({
  participants,
  rounds,
  onChange,
}: ManualFixtureBuilderProps) {
  function updateRound(index: number, next: ManualRoundDraft) {
    onChange(rounds.map((round, i) => (i === index ? next : round)));
  }

  function addRound() {
    const nextSequence = rounds.length
      ? Math.max(...rounds.map((r) => r.sequence)) + 1
      : 1;
    onChange([...rounds, emptyManualRound(nextSequence)]);
  }

  if (participants.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Add at least two players to the roster before building a manual schedule.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Define each round and pairing to mirror an existing schedule. Preview validates
        duplicates and missing players before commit.
      </p>
      {rounds.map((round, roundIndex) => (
        <div key={round.sequence} className="rounded-lg border bg-muted/50 space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              Round
              <input
                type="number"
                min={1}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-20"
                value={round.sequence}
                onChange={(e) =>
                  updateRound(roundIndex, {
                    ...round,
                    sequence: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </label>
            {rounds.length > 1 ? (
              <button
                type="button"
                className={buttonVariants({ variant: "outline", className: "text-xs" })}
                onClick={() => onChange(rounds.filter((_, i) => i !== roundIndex))}
              >
                Remove round
              </button>
            ) : null}
          </div>
          <ul className="space-y-2">
            {round.pairings.map((pairing, pairingIndex) => (
              <li
                key={pairingIndex}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 flex-1"
                  value={pairing.participantAId}
                  onChange={(e) => {
                    const pairings = [...round.pairings];
                    pairings[pairingIndex] = {
                      ...pairing,
                      participantAId: e.target.value,
                    };
                    updateRound(roundIndex, { ...round, pairings });
                  }}
                >
                  <option value="">Player A…</option>
                  {participants.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.displayName}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground">vs</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 flex-1"
                  value={pairing.participantBId}
                  onChange={(e) => {
                    const pairings = [...round.pairings];
                    pairings[pairingIndex] = {
                      ...pairing,
                      participantBId: e.target.value,
                    };
                    updateRound(roundIndex, { ...round, pairings });
                  }}
                >
                  <option value="">Player B…</option>
                  {participants.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.displayName}
                    </option>
                  ))}
                </select>
                {round.pairings.length > 1 ? (
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: "outline",
                      className: "text-xs",
                    })}
                    onClick={() => {
                      const pairings = round.pairings.filter(
                        (_, i) => i !== pairingIndex,
                      );
                      updateRound(roundIndex, { ...round, pairings });
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={buttonVariants({ variant: "outline", className: "text-xs" })}
            onClick={() =>
              updateRound(roundIndex, {
                ...round,
                pairings: [...round.pairings, { participantAId: "", participantBId: "" }],
              })
            }
          >
            Add pairing
          </button>
        </div>
      ))}
      <button
        type="button"
        className={buttonVariants({ variant: "outline" })}
        onClick={addRound}
      >
        Add round
      </button>
    </div>
  );
}
