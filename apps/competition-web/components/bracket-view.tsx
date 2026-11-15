import Link from "next/link";
import type { BracketMatchView, BracketSlotView, BracketView } from "../lib/types";

function SlotRow({ slot, winnerId }: { slot: BracketSlotView; winnerId: string | null }) {
  if (slot.kind !== "player") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm italic text-muted-foreground">
        <span className="w-5 text-right text-xs tabular-nums" aria-hidden="true" />
        {slot.kind === "bye" ? "Bye" : "To be decided"}
      </div>
    );
  }
  const won = winnerId === slot.participantId;
  const lost = winnerId !== null && !won;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-sm ${
        won
          ? "font-semibold text-foreground"
          : lost
            ? "text-muted-foreground line-through"
            : "text-foreground"
      }`}
    >
      <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">
        {slot.seed}
      </span>
      <span className="truncate">{slot.displayName}</span>
      {won ? (
        <span className="ml-auto text-success" aria-label="winner">
          ✓
        </span>
      ) : null}
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatchView }) {
  return (
    <li className="w-52 divide-y divide-border rounded-lg border border-border bg-card">
      <SlotRow slot={match.a} winnerId={match.winnerId} />
      <SlotRow slot={match.b} winnerId={match.winnerId} />
    </li>
  );
}

/** A single-elimination bracket: one column per round, scrolling sideways when wide. */
export function BracketTree({
  bracket,
  seasonId,
}: {
  bracket: BracketView;
  /** Player links open the player in this event. */
  seasonId?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-2">
        <ol className="flex min-w-max gap-6" aria-label="Bracket">
          {bracket.rounds.map((round) => (
            <li key={round.round} className="flex flex-col">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {round.label}
              </h3>
              <ul className="flex flex-1 flex-col justify-around gap-3">
                {round.matches.map((match) => (
                  <MatchCard key={match.key} match={match} />
                ))}
              </ul>
            </li>
          ))}
          {bracket.thirdPlace ? (
            <li className="flex flex-col">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Third place
              </h3>
              <ul className="flex flex-1 flex-col justify-around">
                <MatchCard match={bracket.thirdPlace} />
              </ul>
            </li>
          ) : null}
        </ol>
      </div>
      {bracket.placements.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {bracket.complete ? "Final placings" : "Placings so far"}
          </h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {bracket.placements.map((placement) => (
              <div key={placement.place} className="contents">
                <dt className="font-medium tabular-nums text-muted-foreground">
                  {placement.place}
                </dt>
                <dd className="text-foreground">
                  {placement.players.map((player, i) => (
                    <span key={player.participantId}>
                      {i > 0 ? ", " : ""}
                      <Link
                        href={`/players/${player.participantId}${
                          seasonId ? `?seasonId=${seasonId}` : ""
                        }`}
                        className="font-medium"
                      >
                        {player.displayName}
                      </Link>
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
