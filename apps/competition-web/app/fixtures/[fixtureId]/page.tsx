import { cn } from "@enigmic-co/ui/cn";
import Link from "next/link";
import { FixtureStateBadge } from "../../../components/site-chrome";
import { RevealedDecklists } from "../../../components/revealed-decklist";
import { apiFetch, publicLoadError } from "../../../lib/api";
import { formatDateTime } from "../../../lib/bff-client";
import type { PublicFixtureDecklists, PublicFixtureView } from "../../../lib/types";

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  let fixture: PublicFixtureView | null = null;
  let decklists: PublicFixtureDecklists | null = null;
  let error: string | null = null;

  try {
    fixture = await apiFetch<PublicFixtureView>(`/v1/public/fixtures/${fixtureId}`);
    if (fixture.state === "finalized") {
      try {
        decklists = await apiFetch<PublicFixtureDecklists>(
          `/v1/public/fixtures/${fixtureId}/decklists`,
        );
      } catch {
        decklists = null;
      }
    }
  } catch (e) {
    // 404: not public (yet), which the fallback below explains.
    const notPublic = e instanceof Error && e.message.startsWith("404 ");
    error = notPublic ? null : `${publicLoadError("this fixture", e)}.`;
  }

  if (error || !fixture) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Fixture</h1>
        <p
          className={cn(
            "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
            "text-sm",
          )}
          role="alert"
        >
          {error ??
            "This fixture is not publicly visible yet. It must be confirmed by the organizer."}
        </p>
        <Link href="/standings" className="text-sm font-medium">
          ← Back to the event
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Link
        href={`/standings?seasonId=${encodeURIComponent(fixture.seasonId)}&tab=fixtures`}
        className="text-sm font-medium"
      >
        ← Back to the event
      </Link>
      <div className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            <Link
              href={`/players/${fixture.participantAId}?seasonId=${fixture.seasonId}`}
              className="text-foreground no-underline hover:text-muted-foreground"
            >
              {fixture.participantADisplayName}
            </Link>
            {" vs "}
            <Link
              href={`/players/${fixture.participantBId}?seasonId=${fixture.seasonId}`}
              className="text-foreground no-underline hover:text-muted-foreground"
            >
              {fixture.participantBDisplayName}
            </Link>
          </h1>
          <FixtureStateBadge state={fixture.state} />
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {fixture.participantAUsername ? (
            <p>Master Duel: {fixture.participantAUsername}</p>
          ) : null}
          {fixture.participantBUsername ? (
            <p>Master Duel: {fixture.participantBUsername}</p>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Confirmed start: {formatDateTime(fixture.confirmedStartAt)}
        </p>
        {fixture.finalizedScore ? (
          <div>
            <h2 className="font-semibold text-foreground">Final score</h2>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {fixture.finalizedScore.matches.map((m) => (
                <li key={m.sequence}>
                  Match {m.sequence}: {m.scoreSummary}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Result not finalized yet.</p>
        )}
        {decklists ? <RevealedDecklists decklists={decklists} /> : null}
        {fixture.state === "finalized" && !decklists ? (
          <p className="text-sm text-muted-foreground">
            Decklists are hidden until players lock decks and allow public decklist
            consent.
          </p>
        ) : null}
        {fixture.streamLinks.length > 0 ? (
          <div>
            <h2 className="font-semibold text-foreground">Stream</h2>
            <ul className="mt-2 space-y-1">
              {fixture.streamLinks.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label ?? link.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
