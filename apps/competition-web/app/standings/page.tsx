"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { BffError, bffFetch } from "../../lib/bff-client";
import {
  eventHref,
  forgetLastEvent,
  readLastEvent,
  type LastEvent,
} from "../../lib/last-event";

export default function StandingsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Opening standings…</p>}
    >
      <StandingsRedirect />
    </Suspense>
  );
}

/**
 * Standings live on each event's page now. Old links (?seasonId=…) go to that
 * event; otherwise the last event opened, if it still opens; otherwise home.
 */
function StandingsRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const seasonId = params.get("seasonId");
  // Which tab of the event to land on (the event page ignores unknown ones).
  const tab = /^[a-z]{1,20}$/.test(params.get("tab") ?? "")
    ? params.get("tab")!
    : undefined;

  useEffect(() => {
    let cancelled = false;
    async function go() {
      if (seasonId) {
        try {
          const target = await bffFetch<LastEvent>(
            `/v1/public/events/lookup?seasonId=${encodeURIComponent(seasonId)}`,
          );
          if (!cancelled) router.replace(eventHref(target, tab));
          return;
        } catch {
          // Gone or private: fall through to the last event.
        }
      }
      const saved = readLastEvent();
      if (saved) {
        try {
          await bffFetch(
            `/v1/public/events/by-slug/${saved.groupSlug}/${saved.seasonSlug}`,
          );
          if (!cancelled) router.replace(eventHref(saved, tab));
          return;
        } catch (e) {
          // Only a definite "not found" forgets it; a network blip keeps it for next time.
          if (e instanceof BffError && e.status === 404) forgetLastEvent();
        }
      }
      if (!cancelled) router.replace("/");
    }
    void go();
    return () => {
      cancelled = true;
    };
  }, [seasonId, tab, router]);

  return <p className="text-sm text-muted-foreground">Opening standings…</p>;
}
