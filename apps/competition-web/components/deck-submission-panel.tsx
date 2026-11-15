"use client";

import { buttonVariants } from "./ui/button";
import { cn } from "@enigmic-co/ui/cn";

import { useEffect, useState } from "react";
import { bffFetch } from "../lib/bff-client";
import { devDeckRevisionId } from "../lib/dev-decks";
import { isFixtureClosed } from "../lib/fixture-states";

type DeckSubmission = {
  id: string;
  state: "draft" | "locked" | "revealed";
  deckRevisionId: string | null;
  lockedAt: string | null;
  revealedAt: string | null;
};

type DeckSubmissionPanelProps = {
  fixture: {
    id: string;
    state: string;
    confirmedStartAt: string | null;
    myParticipantId?: string;
    matches: Array<{ id: string }>;
  };
  onUpdated: () => void;
};

export function DeckSubmissionPanel({ fixture, onUpdated }: DeckSubmissionPanelProps) {
  const [submission, setSubmission] = useState<DeckSubmission | null | undefined>(
    undefined,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const match = fixture.matches[0];
  const canSubmit =
    !!fixture.confirmedStartAt &&
    !isFixtureClosed(fixture.state) &&
    !!fixture.myParticipantId &&
    !!match;

  useEffect(() => {
    if (!match) {
      setSubmission(null);
      return;
    }
    void bffFetch<DeckSubmission | null>(`/v1/matches/${match.id}/deck-submissions/mine`)
      .then(setSubmission)
      .catch(() => setSubmission(null));
  }, [match?.id, fixture.state]);

  async function lockDeck() {
    if (!match || !fixture.myParticipantId) return;
    setBusy(true);
    setError(null);
    try {
      await bffFetch(`/v1/matches/${match.id}/deck-submissions`, {
        method: "POST",
        body: JSON.stringify({
          deckRevisionId: devDeckRevisionId(fixture.myParticipantId),
        }),
      });
      onUpdated();
      const next = await bffFetch<DeckSubmission | null>(
        `/v1/matches/${match.id}/deck-submissions/mine`,
      );
      setSubmission(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to lock deck");
    } finally {
      setBusy(false);
    }
  }

  if (!canSubmit) return null;

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">Deck submission</p>
      {submission === undefined ? (
        <p className="text-xs text-muted-foreground">Loading deck status…</p>
      ) : submission ? (
        <p className="text-xs text-muted-foreground">
          Deck locked ({submission.state}
          {submission.revealedAt
            ? ", revealed after finalization"
            : ", hidden until match ends"}
          ).
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Lock your deck before the match. Decklists stay hidden until the result is
            finalized (if you allow public decklist consent).
          </p>
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy}
            onClick={() => void lockDeck()}
          >
            Lock dev deck
          </button>
        </>
      )}
      {error ? (
        <p
          className={cn(
            "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
            "text-xs",
          )}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
