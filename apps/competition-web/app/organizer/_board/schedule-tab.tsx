"use client";

import { buttonVariants } from "../../../components/ui/button";

import { ScheduleFields, scheduleDraftValid } from "../../../components/schedule-fields";
import { formatDateRange } from "../../../lib/bff-client";
import type { Board } from "./use-board";

/** Schedule: event dates, suggested one-day round times, and confirming them per round. */
export function ScheduleTab({ board }: { board: Board }) {
  const {
    ctx,
    busy,
    schedule,
    scheduleDraft,
    setScheduleDraft,
    isMain,
    ended,
    confirmRoundTimes,
    saveSchedule,
  } = board;
  return (
    <>
      {ctx && schedule ? (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Event schedule</h2>
            <p className="text-sm text-muted-foreground">
              When the event runs, shown to players and on Standings. For a one-day event,
              each round gets a suggested start time.
            </p>
          </div>
          {isMain && !ended ? (
            <>
              <ScheduleFields value={scheduleDraft} onChange={setScheduleDraft} />
              <button
                type="button"
                className={buttonVariants()}
                disabled={busy || !scheduleDraftValid(scheduleDraft)}
                onClick={() => void saveSchedule()}
              >
                Save schedule
              </button>
            </>
          ) : (
            <p className="text-sm text-foreground">
              {schedule.startsAt
                ? formatDateRange(schedule.startsAt, schedule.endsAt, ctx.timezone)
                : "No dates set"}
            </p>
          )}
          {schedule.rounds.length ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">Rounds so far</p>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {schedule.rounds.map((round) => (
                  <li
                    key={round.roundId}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <span className="text-foreground">
                      {round.label}
                      {round.suggestedStartAt
                        ? ` · ${new Date(round.suggestedStartAt).toLocaleTimeString(
                            undefined,
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone: ctx.timezone,
                            },
                          )}`
                        : ""}
                      <span className="ml-2 text-muted-foreground">
                        {round.withoutTime
                          ? `${round.withoutTime} of ${round.matches} without a time`
                          : "all timed"}
                      </span>
                    </span>
                    {round.withoutTime && !ended ? (
                      <button
                        type="button"
                        className={buttonVariants({
                          variant: "outline",
                          className: "px-2 py-0.5 text-xs",
                        })}
                        disabled={busy}
                        onClick={() => void confirmRoundTimes(round.roundId, round.label)}
                      >
                        Confirm suggested times
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Any organiser can confirm a round&apos;s times; once a match has a time,
                only the main organiser can change it.
              </p>
            </div>
          ) : null}
          {schedule.slots.length ? (
            <div className="text-sm">
              <p className="font-medium text-foreground">Suggested round times (saved)</p>
              <ol className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                {schedule.slots.map((slot) => (
                  <li key={slot.round}>
                    Round {slot.round}:{" "}
                    {new Date(slot.startAt).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: ctx.timezone,
                    })}
                    {slot.breakAfterMinutes
                      ? ` · break ${slot.breakAfterMinutes} min`
                      : ""}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
