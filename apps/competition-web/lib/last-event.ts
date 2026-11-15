/**
 * The event someone last opened, so Standings takes them back to it and the
 * top bar shows its name and logo.
 *
 * Rewritten from tourny-arc's cookie, which lost track of the event: here
 * the event page's link (/<group>/<event>) is the only source of truth, it's
 * saved each time an event page shows, and a saved event that no longer
 * opens is forgotten rather than followed.
 */

const KEY = "enigmic-last-event";
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const ID = /^[A-Za-z0-9_-]{1,80}$/;

/** Window event fired when the remembered event changes (this tab). */
export const LAST_EVENT_CHANGED = "enigmic-last-event-changed";

export type LastEvent = {
  groupSlug: string;
  seasonSlug: string;
  /** Ids, so links (My fixtures, the board) can scope to it; missing from older values. */
  seasonId?: string;
  groupId?: string;
  /** For the top bar; missing from values saved before it showed them. */
  name?: string;
  groupName?: string;
  logoUrl?: string | null;
  game?: string | null;
  /** A private group's or hidden event: forgotten on sign-out. */
  private?: boolean;
};

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.length > 0 && value.length <= max
    ? value
    : undefined;

/** A saved value, if it's a well-formed link (display fields kept only if sane). */
export function parseLastEvent(raw: string | null): LastEvent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof value.groupSlug === "string" &&
      typeof value.seasonSlug === "string" &&
      SLUG.test(value.groupSlug) &&
      SLUG.test(value.seasonSlug)
    ) {
      const logoUrl = text(value.logoUrl, 2000);
      const id = (v: unknown) => (typeof v === "string" && ID.test(v) ? v : undefined);
      return {
        groupSlug: value.groupSlug,
        seasonSlug: value.seasonSlug,
        seasonId: id(value.seasonId),
        groupId: id(value.groupId),
        name: text(value.name, 200),
        groupName: text(value.groupName, 200),
        // Only https images (as the API accepts) end up in the top bar.
        logoUrl: logoUrl?.startsWith("https://") ? logoUrl : null,
        game: text(value.game, 40) ?? null,
        private: value.private === true,
      };
    }
  } catch {
    // Not ours, or damaged: treat as nothing saved.
  }
  return null;
}

/** What to remember of an event card (home, calendar picker, event page). */
export function lastEventOf(event: {
  groupSlug: string;
  seasonSlug: string;
  seasonId: string;
  groupId: string;
  name: string;
  groupName: string;
  logoUrl: string | null;
  game: string | null;
  private: boolean;
  hidden?: boolean;
}): LastEvent {
  return {
    groupSlug: event.groupSlug,
    seasonSlug: event.seasonSlug,
    seasonId: event.seasonId,
    groupId: event.groupId,
    name: event.name,
    groupName: event.groupName,
    logoUrl: event.logoUrl,
    game: event.game,
    private: event.private || Boolean(event.hidden),
  };
}

/**
 * The organiser board, on the chosen event when you organise its group;
 * otherwise the board's own default.
 */
export function organizerHref(
  chosen: LastEvent | null,
  organisedGroupIds: string[],
): string {
  if (
    !chosen?.groupId ||
    !chosen.seasonId ||
    !organisedGroupIds.includes(chosen.groupId)
  ) {
    return "/organizer";
  }
  return `/organizer?groupId=${encodeURIComponent(chosen.groupId)}&seasonId=${encodeURIComponent(chosen.seasonId)}`;
}

/** My fixtures for the chosen event (all your matches when none is chosen). */
export function myFixturesHref(chosen: LastEvent | null): string {
  return chosen?.seasonId
    ? `/my-fixtures?seasonId=${encodeURIComponent(chosen.seasonId)}`
    : "/my-fixtures";
}

export function eventHref(event: LastEvent, tab?: string): string {
  const base = `/${event.groupSlug}/${event.seasonSlug}`;
  return tab ? `${base}?tab=${tab}` : base;
}

/** Storage can be blocked (private windows, settings): then nothing is remembered. */
export function readLastEvent(): LastEvent | null {
  try {
    return parseLastEvent(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function rememberEvent(event: LastEvent): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(event));
  } catch {
    // Not remembered; the link still works.
  }
  announce();
}

export function forgetLastEvent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
  announce();
}

/** Other tabs hear of it through the storage event; this tab through this one. */
function announce(): void {
  window.dispatchEvent(new Event(LAST_EVENT_CHANGED));
}

/** Storage key, for listening to other tabs' changes. */
export const LAST_EVENT_KEY = KEY;
