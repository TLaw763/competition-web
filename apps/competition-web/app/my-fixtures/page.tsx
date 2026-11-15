"use client";

import { buttonVariants } from "../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FixtureCard } from "../../components/fixture-card";
import { DeckSubmissionPanel } from "../../components/deck-submission-panel";
import { FixtureAvailability } from "../../components/fixture-availability";
import { ResultEntry } from "../../components/result-entry";
import { useAuth } from "../../components/auth-provider";
import { LinkRequestsPanel } from "../../components/link-requests";
import { FixturesSkeleton } from "../../components/skeleton";
import { mySide, openProposal, useAccess } from "../../lib/access";
import { organizerHref, readLastEvent } from "../../lib/last-event";
import { toDateTimeLocal } from "../../lib/availability";
import { bffFetch, formatDateTime, type ResultGame } from "../../lib/bff-client";
import { isFixtureClosed } from "../../lib/fixture-states";
import type { FixtureView } from "../../lib/types";

export default function MyFixturesPage() {
  return (
    <Suspense fallback={<FixturesSkeleton />}>
      <MyFixtures />
    </Suspense>
  );
}

/**
 * Your matches. With ?seasonId (the top bar's link once an event is chosen)
 * only that event's, so a competition's pages stay in that competition.
 */
function MyFixtures() {
  const { session, loading: authLoading } = useAuth();
  const { access } = useAccess();
  const seasonId = useSearchParams().get("seasonId");
  // Browser-only: the board link follows the chosen event.
  const [boardHref, setBoardHref] = useState("/organizer");
  useEffect(() => {
    setBoardHref(
      organizerHref(
        readLastEvent(),
        (access?.groups ?? []).map((g) => g.competitionId),
      ),
    );
  }, [access]);
  const [fixtures, setFixtures] = useState<FixtureView[]>([]);
  const [byes, setByes] = useState<MyBye[]>([]);
  // Until the first load ends, "No fixtures" would be wrong: show placeholders.
  const [loaded, setLoaded] = useState(false);
  const [othersVisible, setOthersVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [proposalTimes, setProposalTimes] = useState<Record<string, string>>({});
  const [proposalNotes, setProposalNotes] = useState<Record<string, string>>({});
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<View>("upcoming");

  useEffect(() => {
    if (!session) return;
    void load();
  }, [session]);

  async function load() {
    setError(null);
    try {
      const res = await bffFetch<{ items: FixtureView[]; byes?: MyBye[] }>(
        "/v1/me/fixtures",
      );
      // Organisers also get their groups' fixtures here; this page is for their own.
      setFixtures(res.items.filter((fixture) => fixture.myParticipantId));
      setByes(res.byes ?? []);
      setOthersVisible(res.items.some((fixture) => !fixture.myParticipantId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fixtures");
      setFixtures([]);
      setByes([]);
    } finally {
      setLoaded(true);
    }
  }

  async function act(fixtureId: string, done: string, path: string, body: unknown = {}) {
    setBusyId(fixtureId);
    setError(null);
    setMessage(null);
    try {
      await bffFetch(`/v1/fixtures/${fixtureId}${path}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessage(done);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  }

  function propose(fixture: FixtureView) {
    const proposedStartAt = proposalTimes[fixture.id];
    if (!proposedStartAt) return;
    const note = proposalNotes[fixture.id]?.trim();
    void act(
      fixture.id,
      "Time proposed — your opponent can accept it or suggest another.",
      "/proposals",
      {
        proposedStartAt: new Date(proposedStartAt).toISOString(),
        note: note || null,
      },
    );
  }

  /** One of your matches with everything you can do on it. */
  function card(fixture: FixtureView, eyebrow?: string) {
    return (
      <FixtureCard
        key={fixture.id}
        fixture={fixture}
        timezone={fixture.timezone}
        eyebrow={eyebrow}
      >
        <DeckSubmissionPanel fixture={fixture} onUpdated={() => void load()} />
        <DatePanel
          fixture={fixture}
          busy={busyId === fixture.id}
          time={proposalTimes[fixture.id] ?? ""}
          note={proposalNotes[fixture.id] ?? ""}
          onTime={(value) =>
            setProposalTimes((prev) => ({ ...prev, [fixture.id]: value }))
          }
          onNote={(value) =>
            setProposalNotes((prev) => ({ ...prev, [fixture.id]: value }))
          }
          onPropose={() => propose(fixture)}
          onAccept={(proposalId) =>
            void act(
              fixture.id,
              "Time agreed — an organiser will confirm it.",
              `/proposals/${proposalId}/accept`,
            )
          }
        />
        <ResultPanel
          fixture={fixture}
          busy={busyId === fixture.id}
          disputeNote={disputeNotes[fixture.id] ?? ""}
          onDisputeNote={(value) =>
            setDisputeNotes((prev) => ({ ...prev, [fixture.id]: value }))
          }
          onLog={(games: ResultGame[]) =>
            void act(
              fixture.id,
              "Result logged — your opponent can confirm or dispute it.",
              "/results",
              { games },
            )
          }
          onConfirm={() =>
            void act(
              fixture.id,
              "Result confirmed — an organiser will finalise it.",
              "/results/confirm",
            )
          }
          onDispute={() =>
            void act(
              fixture.id,
              "Result disputed — an organiser will settle it.",
              "/results/dispute",
              { note: disputeNotes[fixture.id]?.trim() || null },
            )
          }
          onWithdraw={() =>
            void act(fixture.id, "Result withdrawn.", "/results/withdraw")
          }
        />
        {fixture.state === "finalized" ? (
          <Link href={`/fixtures/${fixture.id}`} className="text-sm font-medium">
            View public fixture page →
          </Link>
        ) : null}
      </FixtureCard>
    );
  }

  const scoped = seasonId ? fixtures.filter((f) => f.seasonId === seasonId) : fixtures;
  const scopedByes = seasonId ? byes.filter((b) => b.seasonId === seasonId) : byes;
  const scopedName = seasonId
    ? (scoped[0]?.seasonName ??
      scopedByes[0]?.seasonName ??
      (readLastEvent()?.seasonId === seasonId ? readLastEvent()?.name : undefined))
    : undefined;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          My fixtures
        </h1>
        <p className="text-sm text-muted-foreground">
          Agree a time with your opponent and log results. An organiser confirms times and
          finalises results before they go public.
        </p>
      </div>
      <LinkRequestsPanel />

      {authLoading ? (
        <FixturesSkeleton />
      ) : !session ? (
        <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm">
          <p>Sign in to view your private fixtures.</p>
          <Link
            href="/login"
            className={buttonVariants({ className: "inline-block no-underline" })}
          >
            Sign in
          </Link>
        </div>
      ) : (
        <>
          {othersVisible ? (
            <p className="rounded-lg border bg-muted/50 p-4 text-sm">
              Confirming times and finalising results for your groups happens on the{" "}
              <Link href={boardHref} className="font-medium">
                Organizer board
              </Link>
              .
            </p>
          ) : null}

          {message ? (
            <p
              className={cn(
                "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
                "text-sm",
              )}
              role="status"
            >
              {message}
            </p>
          ) : null}
          {error ? (
            <p
              className={cn(
                "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
                "text-sm",
              )}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {seasonId && loaded ? (
            <p className="rounded-lg border bg-muted/50 flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-foreground">
              <span>
                Showing <span className="font-medium">{scopedName ?? "this event"}</span>{" "}
                only.
              </span>
              <Link href="/my-fixtures" className="font-medium">
                Show all my events
              </Link>
            </p>
          ) : null}

          {!loaded ? (
            <FixturesSkeleton />
          ) : seasonId && scoped.length === 0 && scopedByes.length === 0 ? (
            <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm text-muted-foreground">
              <p>You have no matches in this event.</p>
              {fixtures.length > 0 || byes.length > 0 ? (
                <Link href="/my-fixtures" className="font-medium">
                  See your matches in other events
                </Link>
              ) : null}
            </div>
          ) : fixtures.length === 0 && byes.length === 0 ? (
            <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm text-muted-foreground">
              <p>No fixtures assigned yet.</p>
              <p>
                Fixtures appear here once an organiser adds you to an event and generates
                the schedule. If an organiser sent you an invitation link, open it to
                join.
              </p>
            </div>
          ) : (
            <MyFixturesLists
              fixtures={scoped}
              byes={scopedByes}
              view={view}
              onView={setView}
              card={card}
            />
          )}
        </>
      )}
    </section>
  );
}

function DatePanel({
  fixture,
  busy,
  time,
  note,
  onTime,
  onNote,
  onPropose,
  onAccept,
}: {
  fixture: FixtureView;
  busy: boolean;
  time: string;
  note: string;
  onTime: (value: string) => void;
  onNote: (value: string) => void;
  onPropose: () => void;
  onAccept: (proposalId: string) => void;
}) {
  const schedulable =
    !isFixtureClosed(fixture.state) &&
    (fixture.state === "generated" ||
      fixture.state === "time_proposed" ||
      fixture.state === "postponed");
  if (!schedulable) return null;
  const open = openProposal(fixture);
  const fromOpponent = open && open.proposedBySide !== mySide(fixture);
  const when = (iso: string) => formatDateTime(iso, fixture.timezone);

  return (
    <div className="space-y-3">
      {open?.status === "accepted" ? (
        <p
          className={cn(
            "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
            "text-sm",
          )}
        >
          Agreed: <strong>{when(open.proposedStartAt)}</strong>. Waiting for an organiser
          to confirm it.
        </p>
      ) : open && fromOpponent ? (
        <div className="rounded-lg border bg-muted/50 space-y-2 p-3 text-sm">
          <p>
            {fixture.opponentDisplayName ?? "Your opponent"} proposes{" "}
            <strong>{when(open.proposedStartAt)}</strong>
            {open.note ? ` — “${open.note}”` : ""}.
          </p>
          <button
            type="button"
            className={buttonVariants()}
            disabled={busy}
            onClick={() => onAccept(open.id)}
          >
            Accept this time
          </button>
          <p className="text-xs text-muted-foreground">Or suggest another time below.</p>
        </div>
      ) : open ? (
        <p className="text-sm text-muted-foreground">
          You proposed <strong>{when(open.proposedStartAt)}</strong>. Waiting for{" "}
          {fixture.opponentDisplayName ?? "your opponent"} to answer.
        </p>
      ) : null}

      {open?.status !== "accepted" ? (
        <div className="space-y-2">
          <FixtureAvailability
            fixtureId={fixture.id}
            onPick={(startUtc) => onTime(toDateTimeLocal(startUtc))}
          />
          {fixture.suggestedStartAt ? (
            <button
              type="button"
              className={buttonVariants({ variant: "outline", className: "text-sm" })}
              disabled={busy}
              onClick={() => onTime(toDateTimeLocal(fixture.suggestedStartAt!))}
            >
              Use the suggested time ({when(fixture.suggestedStartAt)})
            </button>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm text-foreground">
              {open ? "Suggest another time" : "Propose a time"}
              <input
                type="datetime-local"
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                value={time}
                onChange={(e) => onTime(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={buttonVariants({ variant: open ? "outline" : "default" })}
              disabled={busy || !time}
              onClick={onPropose}
            >
              {open ? "Suggest" : "Propose"}
            </button>
          </div>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Note (optional)
            <input
              type="text"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              placeholder="e.g. Weekday evenings only"
              maxLength={500}
              value={note}
              onChange={(e) => onNote(e.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function ResultPanel({
  fixture,
  busy,
  disputeNote,
  onDisputeNote,
  onLog,
  onConfirm,
  onDispute,
  onWithdraw,
}: {
  fixture: FixtureView;
  busy: boolean;
  disputeNote: string;
  onDisputeNote: (value: string) => void;
  onLog: (games: ResultGame[]) => void;
  onConfirm: () => void;
  onDispute: () => void;
  onWithdraw: () => void;
}) {
  if (isFixtureClosed(fixture.state) || !fixture.confirmedStartAt) return null;
  const result = fixture.resultSubmission ?? null;
  const loggedByMe = result?.submittedBySide === mySide(fixture);
  const opponent = fixture.opponentDisplayName ?? "Your opponent";

  if (!result) {
    if (fixture.state !== "confirmed" && fixture.state !== "in_progress") return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Log the result</p>
        <ResultEntry
          disabled={busy}
          isPlayerA={fixture.isPlayerA ?? false}
          onSubmit={onLog}
        />
      </div>
    );
  }

  if (result.state === "submitted" && !loggedByMe) {
    return (
      <div className="space-y-2 text-sm">
        <p>{opponent} logged this result. Is it right?</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonVariants()}
            disabled={busy}
            onClick={onConfirm}
          >
            Confirm result
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "destructive" })}
            disabled={busy}
            onClick={onDispute}
          >
            Dispute
          </button>
        </div>
        <label className="flex flex-col gap-1 text-foreground">
          What's wrong? (sent with a dispute)
          <input
            type="text"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            maxLength={500}
            placeholder="e.g. I won 2-1"
            value={disputeNote}
            onChange={(e) => onDisputeNote(e.target.value)}
          />
        </label>
      </div>
    );
  }

  if (result.state === "submitted") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <p>You logged this result. Waiting for {opponent} to confirm or dispute it.</p>
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          disabled={busy}
          onClick={onWithdraw}
        >
          Withdraw
        </button>
      </div>
    );
  }

  if (result.state === "confirmed") {
    return (
      <p
        className={cn(
          "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
          "text-sm",
        )}
      >
        Both players agree. Waiting for an organiser to finalise the result.
      </p>
    );
  }

  if (result.state === "disputed") {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-warning">
          {loggedByMe ? `${opponent} disputed your result` : "You disputed this result"}
          {result.disputeNote ? `: “${result.disputeNote}”` : ""}. An organiser will
          settle it.
        </p>
        {loggedByMe ? (
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={busy}
            onClick={onWithdraw}
          >
            Withdraw and log it again
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}

type MyBye = {
  roundId: string;
  roundLabel: string;
  roundSequence: number;
  seasonId: string;
  seasonName: string;
  competitionName: string;
};

type View = "upcoming" | "past";

/**
 * Upcoming: matches with a confirmed time (soonest first), then the ones
 * without, by event and round. Past: finished and cancelled, newest first.
 * A bye shows under Upcoming while you still have matches to play in its event.
 */
function MyFixturesLists({
  fixtures,
  byes,
  view,
  onView,
  card,
}: {
  fixtures: FixtureView[];
  byes: MyBye[];
  view: View;
  onView: (view: View) => void;
  card: (fixture: FixtureView, eyebrow?: string) => React.ReactNode;
}) {
  const open = fixtures.filter((f) => !isFixtureClosed(f.state));
  const scheduled = open
    .filter((f) => f.confirmedStartAt)
    .sort((a, b) => a.confirmedStartAt!.localeCompare(b.confirmedStartAt!));
  const unscheduled = open.filter((f) => !f.confirmedStartAt);
  const closed = fixtures.filter((f) => isFixtureClosed(f.state));
  const past = [
    ...closed
      .filter((f) => f.confirmedStartAt)
      .sort((a, b) => b.confirmedStartAt!.localeCompare(a.confirmedStartAt!)),
    ...closed.filter((f) => !f.confirmedStartAt),
  ];
  const playing = new Set(open.map((f) => f.seasonId));
  const openByes = byes.filter((b) => playing.has(b.seasonId));
  const pastByes = byes.filter((b) => !playing.has(b.seasonId));
  const eyebrow = (f: FixtureView) =>
    headingFor(f.competitionName, f.seasonName, f.roundLabel);

  return (
    <div className="space-y-6">
      <nav
        className="flex gap-1 overflow-x-auto border-b border-border"
        role="tablist"
        aria-label="My fixtures"
      >
        {(
          [
            ["upcoming", `Upcoming (${open.length})`],
            ["past", `Past (${closed.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`my-tab-${id}`}
            aria-selected={view === id}
            aria-controls="my-panel"
            className="-mb-px whitespace-nowrap border-b-2 border-transparent px-2 py-2 text-sm font-medium text-muted-foreground no-underline hover:text-foreground aria-selected:border-primary aria-selected:text-foreground sm:px-3"
            onClick={() => onView(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div
        id="my-panel"
        role="tabpanel"
        aria-labelledby={`my-tab-${view}`}
        className="space-y-8"
      >
        {view === "upcoming" ? (
          open.length === 0 && openByes.length === 0 ? (
            <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
              Nothing left to play. Finished matches are under Past.
            </p>
          ) : (
            <>
              {scheduled.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">Scheduled</h2>
                  <ul className="space-y-4">
                    {scheduled.map((f) => card(f, eyebrow(f)))}
                  </ul>
                </section>
              ) : null}
              {unscheduled.length > 0 || openByes.length > 0 ? (
                <section className="space-y-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Not scheduled yet
                  </h2>
                  <RoundGroups fixtures={unscheduled} byes={openByes} card={card} />
                </section>
              ) : null}
            </>
          )
        ) : past.length === 0 && pastByes.length === 0 ? (
          <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            No finished matches yet.
          </p>
        ) : (
          <>
            {past.length > 0 ? (
              <ul className="space-y-4">{past.map((f) => card(f, eyebrow(f)))}</ul>
            ) : null}
            {pastByes.length > 0 ? (
              <RoundGroups fixtures={[]} byes={pastByes} card={card} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** Matches under "Event — Round" headings, with your bye in that round. */
function RoundGroups({
  fixtures,
  byes,
  card,
}: {
  fixtures: FixtureView[];
  byes: MyBye[];
  card: (fixture: FixtureView) => React.ReactNode;
}) {
  return (
    <>
      {groupFixtures(fixtures, byes).map(([heading, roundFixtures, bye]) => (
        <section key={heading} className="space-y-4">
          <h3 className="text-base font-semibold text-foreground">{heading}</h3>
          {bye ? (
            <p className="rounded-lg border bg-muted/50 p-4 text-sm text-foreground">
              <span className="font-medium">You have a bye this round.</span>{" "}
              <span className="text-muted-foreground">
                No match to play: it counts as a win in the standings.
              </span>
            </p>
          ) : null}
          {roundFixtures.length > 0 ? (
            <ul className="space-y-4">{roundFixtures.map((f) => card(f))}</ul>
          ) : null}
        </section>
      ))}
    </>
  );
}

const headingFor = (competition?: string, season?: string, round?: string) =>
  [[competition, season].filter(Boolean).join(" · "), round ?? "Fixtures"]
    .filter(Boolean)
    .join(" — ");

/**
 * Event, then round: "Store League · Season 1 — Round 2". A round with your
 * bye (Swiss) has its own heading, among that event's rounds.
 */
function groupFixtures(
  fixtures: FixtureView[],
  byes: MyBye[],
): Array<[string, FixtureView[], MyBye | null]> {
  const groups = new Map<
    string,
    { event: string; round: number; fixtures: FixtureView[]; bye: MyBye | null }
  >();
  const roundNumber = (label?: string) =>
    Number(/(\d+)\s*$/.exec(label ?? "")?.[1] ?? Infinity);
  for (const fixture of fixtures) {
    const label = headingFor(
      fixture.competitionName,
      fixture.seasonName,
      fixture.roundLabel,
    );
    const group = groups.get(label) ?? {
      event: fixture.seasonId,
      round: roundNumber(fixture.roundLabel),
      fixtures: [],
      bye: null,
    };
    group.fixtures.push(fixture);
    groups.set(label, group);
  }
  for (const bye of byes) {
    const label = headingFor(bye.competitionName, bye.seasonName, bye.roundLabel);
    const group = groups.get(label) ?? {
      event: bye.seasonId,
      round: bye.roundSequence,
      fixtures: [],
      bye: null,
    };
    group.bye = bye;
    groups.set(label, group);
  }
  // Events in the order they first appear; rounds in order within each.
  const events = [...new Set([...groups.values()].map((g) => g.event))];
  return [...groups.entries()]
    .sort(
      ([, a], [, b]) =>
        events.indexOf(a.event) - events.indexOf(b.event) || a.round - b.round,
    )
    .map(([label, g]) => [label, g.fixtures, g.bye]);
}
