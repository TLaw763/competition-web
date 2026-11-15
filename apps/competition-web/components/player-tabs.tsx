"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { bffFetch } from "../lib/bff-client";
import type { MyProfile } from "../lib/types";
import { AccountPanel } from "./account-panel";
import { useAuth } from "./auth-provider";

type Tab = "comp" | "profile" | "account";

/**
 * The player page's tabs: This comp (the event they came from), Profile
 * (every event) and Account, which only the player themselves sees.
 * `ownerIds`: the page's player records, to tell whether it's the viewer's.
 */
export function PlayerTabs({
  comp,
  profile,
  ownerIds,
}: {
  comp: ReactNode | null;
  profile: ReactNode | null;
  ownerIds: string[];
}) {
  const { session } = useAuth();
  const params = useSearchParams();
  const pathname = usePathname();
  const [mine, setMine] = useState(false);
  const owners = ownerIds.join(",");

  useEffect(() => {
    if (!session) return setMine(false);
    let cancelled = false;
    void bffFetch<MyProfile>("/v1/me/profile")
      .then((p) => {
        const ids = owners.split(",");
        if (!cancelled) setMine(p.participantIds.some((id) => ids.includes(id)));
      })
      .catch(() => !cancelled && setMine(false));
    return () => {
      cancelled = true;
    };
  }, [session, owners]);

  const tabs = (
    [
      ["comp", "This comp", comp !== null],
      ["profile", "Profile", profile !== null],
      ["account", "Account", mine],
    ] as const
  ).filter(([, , show]) => show);
  const fallback: Tab = comp ? "comp" : "profile";
  const asked = params.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(asked ?? fallback);
  const shown = tabs.some(([id]) => id === tab) ? tab : fallback;

  function choose(next: Tab) {
    setTab(next);
    const qs = new URLSearchParams(params.toString());
    if (next === fallback) qs.delete("tab");
    else qs.set("tab", next);
    const search = qs.toString();
    window.history.replaceState(null, "", search ? `${pathname}?${search}` : pathname);
  }

  return (
    <div className="space-y-6">
      {tabs.length > 1 ? (
        <div
          role="tablist"
          aria-label="Player sections"
          className="flex gap-6 overflow-x-auto border-b border-border"
        >
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`player-tab-${id}`}
              aria-selected={shown === id}
              aria-controls={`player-panel-${id}`}
              className={`-mb-px whitespace-nowrap border-b-2 py-3 text-sm font-semibold ${
                shown === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => choose(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        role={tabs.length > 1 ? "tabpanel" : undefined}
        id={`player-panel-${shown}`}
        aria-labelledby={tabs.length > 1 ? `player-tab-${shown}` : undefined}
        className="space-y-6"
      >
        {shown === "comp" ? comp : null}
        {shown === "profile" ? profile : null}
        {shown === "account" ? (
          <AccountPanel returnTo={currentHref(pathname, params)} />
        ) : null}
      </div>
    </div>
  );
}

function currentHref(pathname: string, params: URLSearchParams): string {
  const qs = new URLSearchParams(params.toString());
  qs.set("tab", "account");
  return `${pathname}?${qs}`;
}
