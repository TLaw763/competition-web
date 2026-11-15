"use client";

import { buttonVariants } from "./ui/button";
import { cn } from "@enigmic-co/ui/cn";

import { useEffect, useState } from "react";
import { bffFetch } from "../lib/bff-client";
import { browserTimezone, WEEKDAY_OPTIONS } from "../lib/availability";
import { TIMEZONE_OPTIONS } from "../lib/format-templates";
import type { MyAvailability, WeeklySlot } from "../lib/types";

/** Your weekly availability (R2): players you share an event with, and its organisers, see it. */
export function AvailabilityEditor() {
  const [timezone, setTimezone] = useState(browserTimezone());
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void bffFetch<MyAvailability>("/v1/me/availability")
      .then((mine) => {
        if (mine.timezone) setTimezone(mine.timezone);
        setSlots(mine.slots);
        setNote(mine.note ?? "");
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load availability"),
      )
      .finally(() => setLoaded(true));
  }, []);

  function update(index: number, patch: Partial<WeeklySlot>) {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await bffFetch<MyAvailability>("/v1/me/availability", {
        method: "PUT",
        body: JSON.stringify({ timezone, slots, note: note.trim() || null }),
      });
      setSlots(saved.slots);
      setMessage("Availability saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const timezones = TIMEZONE_OPTIONS.includes(
    timezone as (typeof TIMEZONE_OPTIONS)[number],
  )
    ? [...TIMEZONE_OPTIONS]
    : [timezone, ...TIMEZONE_OPTIONS];

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          When you're usually free
        </h2>
        <p className="text-sm text-muted-foreground">
          Your opponents see this when picking a match time, and so do your events'
          organisers. It isn't public.
        </p>
      </div>
      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <label className="flex max-w-xs flex-col gap-1 text-sm text-foreground">
            Your timezone
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>

          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No times yet.</p>
          ) : (
            <ul className="space-y-2">
              {slots.map((slot, index) => (
                <li key={index} className="flex flex-wrap items-end gap-2 text-sm">
                  <label className="flex flex-col gap-1 text-foreground">
                    Day
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                      value={slot.day}
                      onChange={(e) =>
                        update(index, { day: e.target.value as WeeklySlot["day"] })
                      }
                    >
                      {WEEKDAY_OPTIONS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-foreground">
                    From
                    <input
                      type="time"
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                      value={slot.start}
                      onChange={(e) => update(index, { start: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-foreground">
                    To
                    <input
                      type="time"
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                      value={slot.end === "24:00" ? "23:59" : slot.end}
                      onChange={(e) =>
                        update(index, {
                          end: e.target.value === "23:59" ? "24:00" : e.target.value,
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className={buttonVariants({ variant: "outline" })}
                    onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className={buttonVariants({ variant: "outline" })}
            disabled={slots.length >= 28}
            onClick={() =>
              setSlots((prev) => [
                ...prev,
                { day: prev.at(-1)?.day ?? "mon", start: "18:00", end: "21:00" },
              ])
            }
          >
            Add a time
          </button>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Note (optional)
            <input
              type="text"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              maxLength={500}
              placeholder="e.g. Can play online most weeknights"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
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
          <button
            type="button"
            className={buttonVariants()}
            disabled={busy}
            onClick={() => void save()}
          >
            Save availability
          </button>
        </>
      )}
    </div>
  );
}
