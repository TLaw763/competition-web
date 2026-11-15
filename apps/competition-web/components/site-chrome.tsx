"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppHeader, type AccountLink, type NavItem } from "@enigmic-co/ui/AppHeader";
import { CalendarDays, History, ListOrdered, Swords, Trophy } from "lucide-react";
import { getFixtureStateMeta } from "../lib/fixture-states";
import { useAuth } from "./auth-provider";
import { useAccess } from "../lib/access";
import { EventLogo } from "./event-branding";
import {
  eventHref,
  forgetLastEvent,
  LAST_EVENT_CHANGED,
  LAST_EVENT_KEY,
  myFixturesHref,
  organizerHref,
  readLastEvent,
  type LastEvent,
} from "../lib/last-event";

/**
 * Once an event is chosen, the links stay in it; Events (home) is where every
 * competition is listed, and where to switch.
 */
function publicLinks(
  chosen: LastEvent | null,
  pathname: string,
  tab: string | null,
): NavItem[] {
  // Links that differ only by ?tab= say themselves which one is current.
  const base = chosen ? eventHref(chosen) : null;
  const onEvent = base !== null && pathname === base;
  return [
    // The title follows the chosen event, so the event list has its own link.
    {
      href: "/",
      label: "Events",
      icon: Trophy,
      active: pathname === "/" && tab !== "past",
    },
    chosen
      ? {
          href: eventHref(chosen, "calendar"),
          label: "Calendar",
          icon: CalendarDays,
          active: onEvent && tab === "calendar",
        }
      : { href: "/calendar", label: "Calendar", icon: CalendarDays },
    chosen
      ? {
          href: eventHref(chosen),
          label: "Standings",
          icon: ListOrdered,
          active: onEvent && tab !== "calendar",
        }
      : { href: "/standings", label: "Standings", icon: ListOrdered },
  ];
}

/** The last event opened, kept up to date as events are opened (here or in other tabs). */
function useChosenEvent(): LastEvent | null {
  const [chosen, setChosen] = useState<LastEvent | null>(null);
  useEffect(() => {
    const read = () => setChosen(readLastEvent());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === LAST_EVENT_KEY) read();
    };
    read();
    window.addEventListener(LAST_EVENT_CHANGED, read);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LAST_EVENT_CHANGED, read);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return chosen;
}

/**
 * The chosen event's logo, name and group in place of the brand (owner
 * decision 2026-11-08); the shared brand until an event is chosen.
 */
function EventTitle({ chosen, name }: { chosen: LastEvent; name: string }) {
  return (
    <Link
      href={eventHref(chosen)}
      className="flex min-w-0 max-w-[14rem] shrink items-center gap-2 no-underline md:max-w-xs"
      aria-label={`${name}${chosen.groupName ? `, ${chosen.groupName}` : ""}: event page`}
    >
      <EventLogo
        name={chosen.groupName ?? name}
        url={chosen.logoUrl ?? null}
        game={chosen.game}
        size="sm"
      />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold text-foreground">
          {name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {chosen.groupName ?? "Competition Tools"}
        </span>
      </span>
    </Link>
  );
}

/**
 * The shared Enigmic header (@enigmic-co/ui, styling guide D-064): icon links,
 * and on the right the account menu (Account, Past events, Organizer, Admin,
 * Theme, Sign out) or Theme + Sign in. On phones everything moves into Menu.
 */
export function SiteHeader() {
  // useSearchParams needs a Suspense boundary on static pages; until it
  // resolves, the header renders without the ?tab= part.
  return (
    <Suspense fallback={<Header tab={null} />}>
      <HeaderWithTab />
    </Suspense>
  );
}

function HeaderWithTab() {
  return <Header tab={useSearchParams()?.get("tab") ?? null} />;
}

function Header({ tab }: { tab: string | null }) {
  const pathname = usePathname() ?? "";
  const { session, loading, logout } = useAuth();
  const { access } = useAccess();
  const chosen = useChosenEvent();
  // A private event's name shouldn't stay on a shared computer after sign-out.
  const signOut = () => {
    if (readLastEvent()?.private) forgetLastEvent();
    void logout();
  };
  // Signed in, Past events and Organizer live in the account menu.
  const nav: NavItem[] = [
    ...publicLinks(chosen, pathname, tab),
    session
      ? { href: myFixturesHref(chosen), label: "My fixtures", icon: Swords }
      : {
          href: "/?tab=past",
          label: "Past events",
          icon: History,
          active: pathname === "/" && tab === "past",
        },
  ];
  const organizer = Boolean(access && access.groups.length > 0);
  const accountLinks: AccountLink[] = [
    { href: "/?tab=past", label: "Past events" },
    ...(organizer
      ? [
          {
            href: organizerHref(
              chosen,
              (access?.groups ?? []).map((g) => g.competitionId),
            ),
            label: "Organizer",
          },
        ]
      : []),
    ...(access?.platformAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <AppHeader
      brand={{ href: "/", name: "Enigmic League" }}
      title={chosen?.name ? <EventTitle chosen={chosen} name={chosen.name} /> : undefined}
      nav={nav}
      menuBelow="md"
      compactBelow="lg"
      account={
        loading
          ? { status: "loading" }
          : session
            ? {
                status: "signed-in",
                displayName: session.displayName,
                accountHref: "/account",
                links: accountLinks,
                onSignOut: signOut,
              }
            : // No Sign up while sign-up is invite-only: invited people get a link.
              { status: "signed-out", signInHref: "/login" }
      }
    />
  );
}

export function FixtureStateBadge({ state }: { state: string }) {
  const meta = getFixtureStateMeta(state);
  return (
    <span
      className={`fixture-state ${meta.className}`}
      aria-label={`Fixture state: ${meta.label}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
