"use client";

import { buttonVariants } from "../../../components/ui/button";

import Link from "next/link";
import { FixtureAvailability } from "../../../components/fixture-availability";
import { FixtureCard } from "../../../components/fixture-card";
import { ResultEntry } from "../../../components/result-entry";
import { openProposal } from "../../../lib/access";
import { toDateTimeLocal } from "../../../lib/availability";
import { formatDateTime } from "../../../lib/bff-client";
import { canConfirmSchedule } from "../../../lib/fixture-states";
import type { FixtureView } from "../../../lib/types";
import type { Board } from "./use-board";

/** One match on the board, with what an organiser can do to it. */
export function OrganiserFixture({
  board,
  fixture,
}: {
  board: Board;
  fixture: FixtureView;
}) {
  const {
    ctx,
    busy,
    confirmTimes,
    setConfirmTimes,
    streamUrls,
    setStreamUrls,
    isMain,
    ended,
    confirmFixture,
    finalizeFixture,
    enterResult,
    addStream,
    postponeFixture,
    cancelFixture,
    correctFixture,
  } = board;
  const proposal = openProposal(fixture);
  const result = fixture.resultSubmission ?? null;
  const names = {
    a: fixture.participantADisplayName ?? "Player A",
    b: fixture.participantBDisplayName ?? "Player B",
  };
  const sideName = (side: "A" | "B" | null) =>
    side === "A"
      ? fixture.participantADisplayName
      : side === "B"
        ? fixture.participantBDisplayName
        : "A player";

  return (
    <FixtureCard
      key={fixture.id}
      id={`fixture-${fixture.id}`}
      fixture={fixture}
      timezone={ctx?.timezone}
    >
      {fixture.state === "cancelled" ? (
        <p className="text-sm text-muted-foreground">
          This fixture was cancelled. It no longer appears on the public calendar and
          cannot be rescheduled from here.
        </p>
      ) : null}

      {canConfirmSchedule(fixture.state) && fixture.confirmedStartAt && !isMain ? (
        <p className="text-sm text-muted-foreground">
          This match already has a time: only the main organiser can change it.
        </p>
      ) : null}

      {canConfirmSchedule(fixture.state) && (isMain || !fixture.confirmedStartAt) ? (
        <div className="space-y-2">
          {proposal?.status === "accepted" ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>
                Both players agreed{" "}
                <strong>{formatDateTime(proposal.proposedStartAt, ctx?.timezone)}</strong>
                .
              </span>
              <button
                type="button"
                className={buttonVariants()}
                disabled={busy}
                onClick={() => void confirmFixture(fixture, proposal.proposedStartAt)}
              >
                Confirm this time
              </button>
            </div>
          ) : proposal ? (
            <p className="text-sm text-muted-foreground">
              {sideName(proposal.proposedBySide)} proposed{" "}
              {formatDateTime(proposal.proposedStartAt, ctx?.timezone)}; waiting for the
              opponent to answer.
            </p>
          ) : null}
          {proposal?.status !== "accepted" ? (
            <FixtureAvailability
              fixtureId={fixture.id}
              onPick={(startUtc) =>
                setConfirmTimes((prev) => ({
                  ...prev,
                  [fixture.id]: toDateTimeLocal(startUtc),
                }))
              }
            />
          ) : null}
          {fixture.suggestedStartAt ? (
            <button
              type="button"
              className={buttonVariants({ variant: "outline", className: "text-sm" })}
              disabled={busy}
              onClick={() =>
                setConfirmTimes((prev) => ({
                  ...prev,
                  [fixture.id]: toDateTimeLocal(fixture.suggestedStartAt!),
                }))
              }
            >
              Use the suggested time
            </button>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm text-foreground">
              Or set a time yourself
              <input
                type="datetime-local"
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                value={confirmTimes[fixture.id] ?? ""}
                onChange={(e) =>
                  setConfirmTimes((prev) => ({ ...prev, [fixture.id]: e.target.value }))
                }
              />
            </label>
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              disabled={busy || !confirmTimes[fixture.id]}
              onClick={() => void confirmFixture(fixture)}
            >
              Confirm time
            </button>
          </div>
        </div>
      ) : null}

      {fixture.state === "confirmed" && isMain && !ended ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Change time (main organiser)
            <input
              type="datetime-local"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={confirmTimes[fixture.id] ?? ""}
              onChange={(e) =>
                setConfirmTimes((prev) => ({ ...prev, [fixture.id]: e.target.value }))
              }
            />
          </label>
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy || !confirmTimes[fixture.id]}
            onClick={() => void confirmFixture(fixture)}
          >
            Change time
          </button>
        </div>
      ) : null}

      {fixture.state === "confirmed" || fixture.state === "in_progress" ? (
        <div className="space-y-2">
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Twitch stream URL
            <input
              type="url"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              placeholder="https://www.twitch.tv/..."
              value={streamUrls[fixture.id] ?? ""}
              onChange={(e) =>
                setStreamUrls((prev) => ({ ...prev, [fixture.id]: e.target.value }))
              }
            />
          </label>
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy}
            onClick={() => void addStream(fixture.id)}
          >
            Add stream link
          </button>
        </div>
      ) : null}

      {result && (result.state === "submitted" || result.state === "confirmed") ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>
            {sideName(result.submittedBySide)} logged the result
            {result.state === "confirmed"
              ? "; the opponent confirmed it."
              : "; the opponent hasn't answered yet."}
          </span>
          <button
            type="button"
            className={buttonVariants()}
            disabled={busy}
            onClick={() => void finalizeFixture(fixture.id)}
          >
            Finalise result
          </button>
        </div>
      ) : null}

      {!result &&
      fixture.state !== "finalized" &&
      fixture.state !== "cancelled" &&
      !ended ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Enter the result</p>
          <p className="text-xs text-muted-foreground">
            Final at once; you can correct it afterwards. Players can also log it
            themselves for you to finalise.
          </p>
          <ResultEntry
            disabled={busy}
            isPlayerA
            playerNames={names}
            onSubmit={(games) => void enterResult(fixture.id, games)}
          />
        </div>
      ) : null}

      {result?.state === "disputed" ? (
        <div className="space-y-2 text-sm">
          <p className="text-warning">
            {sideName(result.submittedBySide)} logged the result and the opponent disputed
            it{result.disputeNote ? `: “${result.disputeNote}”` : "."}
          </p>
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy}
            onClick={() => void finalizeFixture(fixture.id)}
          >
            Finalise as logged
          </button>
          <p className="font-medium text-foreground">Or settle it with the right score</p>
          <ResultEntry
            disabled={busy}
            isPlayerA
            playerNames={names}
            onSubmit={(games) => void finalizeFixture(fixture.id, games)}
          />
        </div>
      ) : null}

      {(fixture.state === "confirmed" ||
        fixture.state === "in_progress" ||
        fixture.state === "result_pending" ||
        fixture.state === "postponed") && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy}
            onClick={() => void postponeFixture(fixture.id)}
          >
            Postpone
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "destructive" })}
            disabled={busy}
            onClick={() => void cancelFixture(fixture.id)}
          >
            Cancel fixture
          </button>
        </div>
      )}

      {fixture.state === "finalized" ? (
        <div className="space-y-2">
          <Link href={`/fixtures/${fixture.id}`} className="text-sm font-medium">
            View public fixture page →
          </Link>
          <div>
            <p className="text-sm font-medium text-foreground">
              Correct finalized result
            </p>
            <ResultEntry
              disabled={busy}
              isPlayerA
              playerNames={names}
              onSubmit={(games) => void correctFixture(fixture, games)}
            />
          </div>
        </div>
      ) : null}
    </FixtureCard>
  );
}
