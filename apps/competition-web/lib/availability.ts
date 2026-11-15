import type { Weekday, WeeklySlot } from "./types";

export const WEEKDAY_OPTIONS: Array<{ id: Weekday; label: string }> = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const LABEL = Object.fromEntries(WEEKDAY_OPTIONS.map((d) => [d.id, d.label])) as Record<
  Weekday,
  string
>;

export function slotLabel(slot: WeeklySlot): string {
  return `${LABEL[slot.day]} ${slot.start}–${slot.end}`;
}

/** The browser's timezone, for a new schedule. */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** A UTC instant as a `datetime-local` value in the browser's timezone. */
export function toDateTimeLocal(utcIso: string): string {
  const date = new Date(utcIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
