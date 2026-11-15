"use client";

import { buttonVariants } from "./ui/button";

import { toDateTimeLocal } from "../lib/availability";
import type { RoundSchedule } from "../lib/types";

/** Event dates and one-day round times, as edited (datetime-local values in the browser's timezone). */
export type ScheduleDraft = {
  startsAt: string;
  endsAt: string;
  oneDay: boolean;
  roundMinutes: number;
  breaks: Array<{ afterRound: number; minutes: number }>;
};

export const EMPTY_SCHEDULE: ScheduleDraft = {
  startsAt: "",
  endsAt: "",
  oneDay: false,
  roundMinutes: 60,
  breaks: [],
};

export function scheduleDraftFrom(view: {
  startsAt: string | null;
  endsAt: string | null;
  roundSchedule: RoundSchedule | null;
}): ScheduleDraft {
  return {
    startsAt: view.startsAt ? toDateTimeLocal(view.startsAt) : "",
    endsAt: view.endsAt ? toDateTimeLocal(view.endsAt) : "",
    oneDay: view.roundSchedule !== null,
    roundMinutes: view.roundSchedule?.roundMinutes ?? 60,
    breaks: view.roundSchedule?.breaks ?? [],
  };
}

/** The API's fields: ISO instants, and round times starting with the event. */
export function schedulePayload(draft: ScheduleDraft) {
  const startsAt = draft.startsAt ? new Date(draft.startsAt).toISOString() : null;
  return {
    startsAt,
    endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    roundSchedule:
      draft.oneDay && startsAt
        ? { startAt: startsAt, roundMinutes: draft.roundMinutes, breaks: draft.breaks }
        : null,
  };
}

/** Round times need a start time. */
export function scheduleDraftValid(draft: ScheduleDraft): boolean {
  if (draft.startsAt && draft.endsAt && draft.endsAt < draft.startsAt) return false;
  if (!draft.oneDay) return true;
  const after = draft.breaks.map((b) => b.afterRound);
  return (
    Boolean(draft.startsAt) &&
    draft.roundMinutes >= 10 &&
    draft.roundMinutes <= 480 &&
    new Set(after).size === after.length &&
    draft.breaks.every((b) => b.afterRound >= 1 && b.minutes >= 5 && b.minutes <= 480)
  );
}

export function ScheduleFields({
  value,
  onChange,
}: {
  value: ScheduleDraft;
  onChange: (next: ScheduleDraft) => void;
}) {
  const set = <K extends keyof ScheduleDraft>(key: K, v: ScheduleDraft[K]) =>
    onChange({ ...value, [key]: v });
  const setBreak = (index: number, patch: Partial<ScheduleDraft["breaks"][number]>) =>
    set(
      "breaks",
      value.breaks.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    );
  const backwards = value.startsAt && value.endsAt && value.endsAt < value.startsAt;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Starts (optional)
          <input
            type="datetime-local"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            value={value.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Ends (optional)
          <input
            type="datetime-local"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            value={value.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
          />
        </label>
      </div>
      {backwards ? (
        <p className="text-sm text-danger" role="alert">
          The event can&apos;t end before it starts.
        </p>
      ) : null}
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={value.oneDay}
          onChange={(e) => set("oneDay", e.target.checked)}
        />
        One-day event: suggest a start time for each round
      </label>
      {value.oneDay ? (
        <div className="rounded-lg border bg-muted/50 space-y-3 p-3 text-sm">
          {!value.startsAt ? (
            <p className="text-warning">
              Set when the event starts: the first round starts then.
            </p>
          ) : null}
          <label className="flex flex-col gap-1 text-foreground">
            Minutes per round
            <input
              type="number"
              min={10}
              max={480}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-28"
              value={value.roundMinutes}
              onChange={(e) => set("roundMinutes", Number(e.target.value))}
            />
          </label>
          <div className="space-y-2">
            <p className="text-foreground">Breaks</p>
            {value.breaks.map((b, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-muted-foreground">
                  After round
                  <input
                    type="number"
                    min={1}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-24"
                    value={b.afterRound}
                    onChange={(e) =>
                      setBreak(index, { afterRound: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-muted-foreground">
                  Minutes
                  <input
                    type="number"
                    min={5}
                    max={480}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-24"
                    value={b.minutes}
                    onChange={(e) => setBreak(index, { minutes: Number(e.target.value) })}
                  />
                </label>
                <button
                  type="button"
                  className={buttonVariants({ variant: "outline" })}
                  onClick={() =>
                    set(
                      "breaks",
                      value.breaks.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() =>
                set("breaks", [
                  ...value.breaks,
                  { afterRound: (value.breaks.at(-1)?.afterRound ?? 2) + 1, minutes: 30 },
                ])
              }
            >
              Add a break
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Suggestions only: players still propose and agree their match times.
          </p>
        </div>
      ) : null}
    </div>
  );
}
