"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../components/auth-provider";
import { bffFetch } from "./bff-client";
import type { FixtureView, GroupAccessRole, MyAccess } from "./types";

/** What the signed-in account may do (the API still checks every call). */
export function useAccess() {
  const { session } = useAuth();
  const [access, setAccess] = useState<MyAccess | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) {
      setAccess(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setAccess(await bffFetch<MyAccess>("/v1/me/access"));
    } catch {
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { access, loading, reload };
}

/** Main organiser powers: the main organiser and the platform admin. */
export function canRunGroup(role: GroupAccessRole | null | undefined): boolean {
  return role === "main_organiser" || role === "platform_admin";
}

export const GROUP_ROLE_LABEL: Record<GroupAccessRole, string> = {
  platform_admin: "Platform admin",
  main_organiser: "Main organiser",
  organiser: "Event organiser",
};

/** The open date proposal (waiting on the opponent or on an organiser), if any. */
export function openProposal(fixture: FixtureView) {
  return (
    [...fixture.scheduleProposals]
      .reverse()
      .find((p) => p.status === "pending" || p.status === "accepted") ?? null
  );
}

export function mySide(fixture: FixtureView): "A" | "B" | null {
  if (!fixture.myParticipantId) return null;
  return fixture.isPlayerA ? "A" : "B";
}
