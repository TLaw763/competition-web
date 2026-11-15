import type { PublicFixtureDecklists } from "../lib/types";

export function RevealedDecklists({ decklists }: { decklists: PublicFixtureDecklists }) {
  const sides = [
    {
      label: decklists.participantA?.displayName ?? "Player A",
      deck: decklists.participantA,
    },
    {
      label: decklists.participantB?.displayName ?? "Player B",
      deck: decklists.participantB,
    },
  ].filter((side) => side.deck);

  if (sides.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-foreground">Revealed decklists</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {sides.map(({ label, deck }) => (
          <div key={deck!.deckRevisionId} className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-medium text-foreground">{label}</h3>
            <p className="text-xs text-muted-foreground">
              Locked {new Date(deck!.lockedAt).toLocaleString()}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {deck!.printings.map((row) => (
                <li key={row.printingId}>
                  {row.name}
                  {row.setCode ? (
                    <span className="text-muted-foreground"> · {row.setCode}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
