"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { useConfirm } from "../../../components/confirm-dialog";
import {
  emptyManualRound,
  manualPairingsPayload,
  type ManualRoundDraft,
} from "../../../components/manual-fixture-builder";
import {
  EMPTY_SCHEDULE,
  scheduleDraftFrom,
  schedulePayload,
  type ScheduleDraft,
} from "../../../components/schedule-fields";
import { useToast } from "../../../components/toast";
import { canRunGroup, openProposal, useAccess } from "../../../lib/access";
import { bffFetch, errorMessage, type ResultGame } from "../../../lib/bff-client";
import { canConfirmSchedule } from "../../../lib/fixture-states";
import { readLastEvent, rememberEvent, type LastEvent } from "../../../lib/last-event";
import type {
  AddPersonResult,
  BracketStatus,
  BracketView,
  FixtureView,
  FormatPlanPreview,
  GroupStaffMember,
  RosterCandidate,
  SeasonContext,
  SeasonFormatPlan,
  SeasonParticipantRow,
  SeasonSchedule,
  SwissStatus,
  TopCutPreview,
} from "../../../lib/types";

export const BOARD_TABS = [
  { id: "overview", label: "Overview" },
  { id: "roster", label: "Roster" },
  { id: "rounds", label: "Rounds & results" },
  { id: "schedule", label: "Schedule" },
  { id: "settings", label: "Settings" },
] as const;

export type BoardTab = (typeof BOARD_TABS)[number]["id"];

export function parseBoardTab(value: string | null): BoardTab {
  return BOARD_TABS.some((t) => t.id === value) ? (value as BoardTab) : "overview";
}

export type GenerationMode = "single_round_robin" | "double_round_robin" | "manual";

function leagueModeFromPlan(plan: SeasonFormatPlan | null): GenerationMode {
  const mode = plan?.phases.find((phase) => phase.kind === "league")?.leagueMode;
  if (
    mode === "double_round_robin" ||
    mode === "single_round_robin" ||
    mode === "manual"
  ) {
    return mode;
  }
  return "single_round_robin";
}

export type GenerationPreview = {
  previewToken: string;
  rounds: Array<{
    sequence: number;
    label: string;
    fixtures: Array<{ participantAId: string; participantBId: string; isBye: boolean }>;
  }>;
  warnings: Array<{ code: string; message: string }>;
  blockingErrors: Array<{ code: string; message: string }>;
};

export type SwissPreview = {
  label: string;
  swissRound: number;
  roundsTotal: number;
  fixtures: Array<{ participantAId: string; participantBId: string }>;
  byeParticipantId: string | null;
  warnings: Array<{ code: string; message: string }>;
  previewToken: string;
};

/** What an organiser has to do on a fixture, most urgent first (D-058). */
export type Approval = {
  fixture: FixtureView;
  kind: "dispute" | "result" | "date";
  label: string;
};

function approvalsFor(fixtures: FixtureView[]): Approval[] {
  const items: Approval[] = [];
  for (const fixture of fixtures) {
    const result = fixture.resultSubmission;
    const vs = `${fixture.participantADisplayName} vs ${fixture.participantBDisplayName}`;
    if (result?.state === "disputed") {
      items.push({ fixture, kind: "dispute", label: `${vs}: result disputed` });
    } else if (result && (result.state === "submitted" || result.state === "confirmed")) {
      items.push({
        fixture,
        kind: "result",
        label:
          result.state === "confirmed"
            ? `${vs}: result agreed by both players`
            : `${vs}: result logged, opponent hasn't answered`,
      });
    } else if (
      openProposal(fixture)?.status === "accepted" &&
      canConfirmSchedule(fixture.state)
    ) {
      items.push({ fixture, kind: "date", label: `${vs}: time agreed by both players` });
    }
  }
  const order = { dispute: 0, result: 1, date: 2 };
  return items.sort((a, b) => order[a.kind] - order[b.kind]);
}

/** Everything the organiser board shows and does; each tab takes what it needs. */
export function useOrganizerBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const { access, loading: accessLoading } = useAccess();
  const [ctx, setCtx] = useState<SeasonContext | null>(null);
  const [seasons, setSeasons] = useState<
    Array<{
      id: string;
      name: string;
      status: string;
      game?: string | null;
      visibility?: "public" | "private";
    }>
  >([]);
  const [staff, setStaff] = useState<GroupStaffMember[]>([]);
  const [organiserEmail, setOrganiserEmail] = useState("");
  const [formatPlan, setFormatPlan] = useState<SeasonFormatPlan | null>(null);
  const [formatPreview, setFormatPreview] = useState<FormatPlanPreview | null>(null);
  const [fixtures, setFixtures] = useState<FixtureView[]>([]);
  const toast = useToast();
  const confirm = useConfirm();
  const setMessage = (text: string) => toast.success(text);
  const setError = (text: string) => toast.error(text);
  const [busy, setBusy] = useState(false);
  // Which group and event the board last finished loading: until it matches, show placeholders.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [confirmTimes, setConfirmTimes] = useState<Record<string, string>>({});
  const [streamUrls, setStreamUrls] = useState<Record<string, string>>({});
  const [generationMode, setGenerationMode] =
    useState<GenerationMode>("single_round_robin");
  const [manualRounds, setManualRounds] = useState<ManualRoundDraft[]>([
    emptyManualRound(1),
  ]);
  const [generationPreview, setGenerationPreview] = useState<GenerationPreview | null>(
    null,
  );
  const [swiss, setSwiss] = useState<SwissStatus | null>(null);
  const [swissPreview, setSwissPreview] = useState<SwissPreview | null>(null);
  const [bracket, setBracket] = useState<BracketStatus | null>(null);
  const [seedOrder, setSeedOrder] = useState<string[]>([]);
  const [thirdPlace, setThirdPlace] = useState(false);
  const [bracketPreview, setBracketPreview] = useState<BracketView | null>(null);
  const [cutPreview, setCutPreview] = useState<TopCutPreview | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [lastInvitation, setLastInvitation] = useState<{
    email: string;
    token: string;
    acceptUrl: string;
    delivery?: "emailed" | "has_account" | "failed" | "off";
  } | null>(null);
  const [invitationEmails, setInvitationEmails] = useState<
    Array<{ to: string; subject: string; acceptUrl: string; createdAt: string }>
  >([]);
  const [rosterPlayers, setRosterPlayers] = useState<SeasonParticipantRow[]>([]);
  const [rosterName, setRosterName] = useState("");
  const [candidates, setCandidates] = useState<RosterCandidate[]>([]);
  const [schedule, setSchedule] = useState<SeasonSchedule | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(EMPTY_SCHEDULE);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    username: string;
    masterDuelId: string;
  } | null>(null);
  const [rosterUsername, setRosterUsername] = useState("");
  const [rosterMasterDuelId, setRosterMasterDuelId] = useState("");
  /** The roster player whose "Link account" email is being entered. */
  const [linking, setLinking] = useState<{ id: string; email: string } | null>(null);
  const [merging, setMerging] = useState<{ id: string; intoId: string } | null>(null);

  const groups = access?.groups ?? [];
  // Without an event in the link, open the chosen event (the one last opened)
  // when its group is one of yours; else the first group. The board renders
  // nothing until access has loaded, so reading storage here is safe.
  const [saved] = useState<LastEvent | null>(() =>
    typeof window === "undefined" ? null : readLastEvent(),
  );
  const savedGroup =
    saved?.groupId && groups.some((g) => g.competitionId === saved.groupId)
      ? saved.groupId
      : null;
  const groupId =
    searchParams.get("groupId") ?? savedGroup ?? groups[0]?.competitionId ?? null;
  const group = groups.find((g) => g.competitionId === groupId) ?? null;
  const isMain = canRunGroup(group?.role);
  const seasonIdParam = searchParams.get("seasonId");
  const tab = parseBoardTab(searchParams.get("tab"));
  const approvals = useMemo(() => approvalsFor(fixtures), [fixtures]);
  const currentSeason = seasons.find((s) => s.id === ctx?.seasonId) ?? null;
  const ended =
    currentSeason?.status === "completed" || currentSeason?.status === "archived";
  /** Master Duel events (or no game set): players have a username and a 9-digit ID. */
  const isMasterDuel = !currentSeason?.game || currentSeason.game === "master_duel";
  const onlineNameLabel = isMasterDuel ? "Master Duel username" : "Online username";

  function select(next: { groupId?: string; seasonId?: string | null; tab?: BoardTab }) {
    const params = new URLSearchParams();
    const g = next.groupId ?? groupId;
    if (g) params.set("groupId", g);
    const s =
      next.groupId && next.groupId !== groupId ? null : (next.seasonId ?? seasonIdParam);
    if (s) params.set("seasonId", s);
    const t = next.tab ?? tab;
    if (t !== "overview") params.set("tab", t);
    router.replace(`/organizer?${params.toString()}`, { scroll: false });
  }

  const refresh = useCallback(async () => {
    if (!groupId || !group) {
      setCtx(null);
      setFixtures([]);
      return;
    }
    const [competition, seasonList, staffList] = await Promise.all([
      bffFetch<{
        id: string;
        name: string;
        timezone: string;
        slug?: string;
        visibility?: "public" | "private";
        logoUrl?: string | null;
      }>(`/v1/competitions/${groupId}`),
      bffFetch<{
        items: Array<{
          id: string;
          name: string;
          status: string;
          game?: string | null;
          visibility?: "public" | "private";
          slug?: string;
          logoUrl?: string | null;
        }>;
      }>(`/v1/competitions/${groupId}/seasons`),
      bffFetch<{ items: GroupStaffMember[] }>(`/v1/competitions/${groupId}/staff`),
    ]);
    setSeasons(seasonList.items);
    setStaff(staffList.items);
    const savedSeason = saved?.groupId === groupId ? saved.seasonId : undefined;
    const season =
      seasonList.items.find((s) => s.id === seasonIdParam) ??
      seasonList.items.find((s) => s.id === savedSeason) ??
      seasonList.items.at(-1) ??
      null;
    if (!season) {
      setCtx(null);
      setFixtures([]);
      setFormatPlan(null);
      setFormatPreview(null);
      setRosterPlayers([]);
      setSwiss(null);
      setBracket(null);
      return;
    }
    const seasonCtx: SeasonContext = {
      competitionId: competition.id,
      competitionName: competition.name,
      seasonId: season.id,
      seasonName: season.name,
      timezone: competition.timezone,
    };
    setCtx(seasonCtx);
    // The event on the board becomes the chosen one: the top bar and links follow it.
    if (competition.slug && season.slug && readLastEvent()?.seasonId !== season.id) {
      rememberEvent({
        groupSlug: competition.slug,
        seasonSlug: season.slug,
        seasonId: season.id,
        groupId: competition.id,
        name: season.name,
        groupName: competition.name,
        logoUrl: season.logoUrl ?? competition.logoUrl ?? null,
        game: season.game ?? null,
        private: competition.visibility === "private" || season.visibility === "private",
      });
    }
    const data = await bffFetch<{ items: FixtureView[] }>(
      `/v1/seasons/${season.id}/fixtures`,
    );
    setFixtures(data.items);
    try {
      const planRes = await bffFetch<{
        formatPlan: SeasonFormatPlan;
        preview: FormatPlanPreview;
      }>(`/v1/seasons/${season.id}/format-plan`);
      setFormatPlan(planRes.formatPlan);
      setFormatPreview(planRes.preview);
      setSwiss(
        planRes.formatPlan.phases.some((p) => p.kind === "swiss")
          ? await bffFetch<SwissStatus>(`/v1/seasons/${season.id}/swiss`)
          : null,
      );
      setBracket(
        planRes.formatPlan.phases.some((p) => p.kind === "bracket")
          ? await bffFetch<BracketStatus>(`/v1/seasons/${season.id}/bracket`)
          : null,
      );
    } catch {
      setFormatPlan(null);
      setFormatPreview(null);
      setSwiss(null);
      setBracket(null);
    }
    const emails = await bffFetch<{
      items: Array<{ to: string; subject: string; acceptUrl: string; createdAt: string }>;
    }>(`/v1/seasons/${season.id}/invitation-emails`);
    setInvitationEmails(emails.items);
    const participants = await bffFetch<{ items: SeasonParticipantRow[] }>(
      `/v1/seasons/${season.id}/participants`,
    );
    setRosterPlayers(participants.items);
    setCandidates(
      await bffFetch<{ items: RosterCandidate[] }>(
        `/v1/seasons/${season.id}/roster-candidates`,
      )
        .then((res) => res.items)
        .catch(() => []),
    );
    const seasonSchedule = await bffFetch<SeasonSchedule>(
      `/v1/seasons/${season.id}/schedule`,
    );
    setSchedule(seasonSchedule);
    setScheduleDraft(scheduleDraftFrom(seasonSchedule));
  }, [groupId, group, seasonIdParam, saved]);

  useEffect(() => {
    if (!formatPlan || !ctx) return;
    const mode = leagueModeFromPlan(formatPlan);
    setGenerationMode(mode);
    if (mode === "manual") {
      setManualRounds([emptyManualRound(1)]);
    }
    setGenerationPreview(null);
    setSwissPreview(null);
    setBracketPreview(null);
    setCutPreview(null);
  }, [ctx?.seasonId, formatPlan?.id]);

  // Seed order starts as the roster order; players added or dropped since are kept in step.
  useEffect(() => {
    const seedable = rosterPlayers.filter((p) => !p.droppedAt).map((p) => p.id);
    setSeedOrder((current) => [
      ...current.filter((id) => seedable.includes(id)),
      ...seedable.filter((id) => !current.includes(id)),
    ]);
  }, [rosterPlayers]);

  useEffect(() => {
    if (!session || accessLoading) return;
    const key = `${groupId}|${seasonIdParam}`;
    void refresh()
      .catch((e) => setError(errorMessage(e, "Failed to load organizer board")))
      .finally(() => setLoadedKey(key));
  }, [refresh, session, accessLoading]);
  const loaded = loadedKey === `${groupId}|${seasonIdParam}`;

  async function runStep(label: string, fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      setMessage(label);
      await refresh();
    } catch (e) {
      setError(errorMessage(e, "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  async function previewGeneration() {
    if (!ctx) return;
    await runStep("Generation preview ready.", async () => {
      const manualPairings =
        generationMode === "manual" ? manualPairingsPayload(manualRounds) : undefined;
      const preview = await bffFetch<GenerationPreview>(
        `/v1/seasons/${ctx.seasonId}/fixtures/generate/preview`,
        {
          method: "POST",
          body: JSON.stringify({
            seasonId: ctx.seasonId,
            mode: generationMode,
            manualPairings,
          }),
        },
      );
      setGenerationPreview(preview);
    });
  }

  async function commitGeneration() {
    if (!ctx || !generationPreview) return;
    if (generationPreview.blockingErrors.length) {
      setError(generationPreview.blockingErrors[0]!.message);
      return;
    }
    await runStep("Fixtures generated.", async () => {
      const key = crypto.randomUUID();
      await bffFetch(`/v1/seasons/${ctx.seasonId}/fixtures/generate/commit`, {
        method: "POST",
        headers: { "idempotency-key": key },
        body: JSON.stringify({
          previewToken: generationPreview.previewToken,
          idempotencyKey: key,
        }),
      });
      setGenerationPreview(null);
    });
  }

  async function previewSwissRound() {
    if (!ctx) return;
    await runStep("Pairings ready: check them, then publish the round.", async () => {
      setSwissPreview(
        await bffFetch<SwissPreview>(
          `/v1/seasons/${ctx.seasonId}/swiss/next-round/preview`,
          {
            method: "POST",
            body: JSON.stringify({}),
          },
        ),
      );
    });
  }

  async function commitSwissRound() {
    if (!ctx || !swissPreview) return;
    await runStep(`${swissPreview.label} published.`, async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/swiss/next-round/commit`, {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ previewToken: swissPreview.previewToken }),
      });
      setSwissPreview(null);
    });
  }

  function moveSeed(index: number, by: number) {
    setSeedOrder((order) => {
      const next = [...order];
      const target = index + by;
      if (target < 0 || target >= next.length) return order;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setBracketPreview(null);
  }

  function shuffleSeeds() {
    setSeedOrder((order) => {
      const next = [...order];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j]!, next[i]!];
      }
      return next;
    });
    setBracketPreview(null);
  }

  async function previewBracket() {
    if (!ctx) return;
    await runStep("Bracket preview ready: check it, then make the bracket.", async () => {
      setBracketPreview(
        await bffFetch<BracketView>(`/v1/seasons/${ctx.seasonId}/bracket/preview`, {
          method: "POST",
          body: JSON.stringify({ seeds: seedOrder, thirdPlace }),
        }),
      );
    });
  }

  async function makeBracket() {
    if (!ctx) return;
    await runStep("Bracket made: the first matches are ready.", async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/bracket`, {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ seeds: seedOrder, thirdPlace }),
      });
      setBracketPreview(null);
    });
  }

  async function previewTopCut() {
    if (!ctx) return;
    await runStep("Top cut ready: check it, then make the cut.", async () => {
      setCutPreview(
        await bffFetch<TopCutPreview>(`/v1/seasons/${ctx.seasonId}/top-cut/preview`, {
          method: "POST",
          body: JSON.stringify({ thirdPlace }),
        }),
      );
    });
  }

  async function makeTopCut() {
    if (!ctx) return;
    await runStep("Top cut made: the first bracket matches are ready.", async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/top-cut`, {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ thirdPlace }),
      });
      setCutPreview(null);
    });
  }

  async function addByEmail(
    people: Array<{ email: string; displayName?: string; participantId?: string }>,
  ) {
    if (!ctx || people.length === 0) return;
    let summary = "";
    await runStep("Players added.", async () => {
      const res = await bffFetch<{ items: AddPersonResult[] }>(
        `/v1/seasons/${ctx.seasonId}/participants/by-email`,
        { method: "POST", body: JSON.stringify({ people }) },
      );
      const count = (status: AddPersonResult["status"]) =>
        res.items.filter((r) => r.status === status).length;
      summary = [
        count("added") ? `${count("added")} added (they have accounts)` : "",
        count("invited") ? `${count("invited")} invited by email` : "",
        count("already_in") ? `${count("already_in")} already in the event` : "",
        count("link_requested")
          ? `${count("link_requested")} already on the roster, asked to confirm the link on their Account page`
          : "",
      ]
        .filter(Boolean)
        .join(", ");
    });
    if (summary) setMessage(`Players: ${summary}.`);
  }

  async function confirmRoundTimes(roundId: string, label: string) {
    if (!ctx) return;
    await runStep(
      `${label}: suggested time confirmed for the matches without one.`,
      async () => {
        await bffFetch(
          `/v1/seasons/${ctx.seasonId}/rounds/${roundId}/confirm-suggested`,
          {
            method: "POST",
            body: JSON.stringify({}),
          },
        );
      },
    );
  }

  async function saveSchedule() {
    if (!ctx) return;
    await runStep("Event dates and round times saved.", async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/schedule`, {
        method: "PUT",
        body: JSON.stringify(schedulePayload(scheduleDraft)),
      });
    });
  }

  async function saveRename() {
    if (!ctx || !editing) return;
    const { id, name, username, masterDuelId } = editing;
    await runStep("Player updated.", async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/participants/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: name,
          onlineClientUsername: username.trim() || null,
          ...(isMasterDuel
            ? { masterDuelId: masterDuelId.replace(/[\s-]/g, "") || null }
            : {}),
        }),
      });
      setEditing(null);
    });
  }

  async function requestLink() {
    if (!ctx || !linking?.email.trim()) return;
    const { id, email } = linking;
    const player = rosterPlayers.find((p) => p.id === id);
    let delivery = "";
    await runStep(`Link request sent to ${email.trim()}.`, async () => {
      const res = await bffFetch<{ delivery: string }>(
        `/v1/seasons/${ctx.seasonId}/participants/${id}/link-request`,
        { method: "POST", body: JSON.stringify({ email: email.trim() }) },
      );
      delivery = res.delivery;
      setLinking(null);
    });
    if (delivery === "has_account") {
      setMessage(
        `${email.trim()} will see the request on their Account page and can accept it to become ${player?.displayName ?? "this player"}.`,
      );
    } else if (delivery === "emailed") {
      setMessage(
        `${email.trim()} has no account yet: we've emailed them a sign-up link. Once signed up they can accept the request on their Account page.`,
      );
    } else if (delivery === "failed") {
      setError(
        "Request saved, but Enigmic accounts couldn't be reached to email a sign-up link. Ask them to sign up, or send it again in a moment.",
      );
    }
  }

  /** A duplicate player (account added twice): its account moves onto the roster player. */
  async function mergePlayer(duplicate: SeasonParticipantRow, intoParticipantId: string) {
    if (!ctx) return;
    const into = rosterPlayers.find((p) => p.id === intoParticipantId);
    if (!into) return;
    if (
      !(await confirm({
        title: `Merge ${duplicate.displayName} into ${into.displayName}?`,
        body: `${into.displayName} gets ${duplicate.displayName}'s account in every event of this group, and ${duplicate.displayName} is removed from the roster. Only works before ${duplicate.displayName} has fixtures.`,
        confirmLabel: "Merge",
      }))
    ) {
      return;
    }
    await runStep(
      `${duplicate.displayName} merged into ${into.displayName}.`,
      async () => {
        await bffFetch(`/v1/seasons/${ctx.seasonId}/participants/${duplicate.id}/merge`, {
          method: "POST",
          body: JSON.stringify({ intoParticipantId }),
        });
        setMerging(null);
      },
    );
  }

  async function cancelLinkRequest(player: SeasonParticipantRow) {
    if (!ctx) return;
    await runStep(`Link request for ${player.displayName} cancelled.`, async () => {
      await bffFetch(
        `/v1/seasons/${ctx.seasonId}/participants/${player.id}/link-request`,
        {
          method: "DELETE",
        },
      );
    });
  }

  async function unlinkPlayer(player: SeasonParticipantRow) {
    if (!ctx) return;
    if (
      !(await confirm({
        title: `Unlink ${player.displayName}?`,
        body: "The player stays on the roster and keeps their results, in every event of this group, but their account no longer plays as them (no My fixtures or result entry).",
        confirmLabel: "Unlink",
      }))
    ) {
      return;
    }
    await runStep(`${player.displayName} is roster-only now.`, async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/participants/${player.id}/link`, {
        method: "DELETE",
      });
    });
  }

  /** A player added by mistake leaves this event (only before they've played in it). */
  async function removePlayer(player: SeasonParticipantRow) {
    if (!ctx) return;
    if (
      !(await confirm({
        title: `Remove ${player.displayName} from the roster?`,
        body: `${player.displayName} leaves this event. Only works before they have fixtures, a bye, a bracket seed or a deck here; to stop pairing someone who has played, use Drop. Their other events in this group aren't touched.`,
        confirmLabel: "Remove",
        danger: true,
      }))
    ) {
      return;
    }
    await runStep(`${player.displayName} removed from the roster.`, async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/participants/${player.id}`, {
        method: "DELETE",
      });
      if (editing?.id === player.id) setEditing(null);
      if (merging?.id === player.id) setMerging(null);
      if (linking?.id === player.id) setLinking(null);
      // Previews made with them on the roster can't be committed any more.
      setGenerationPreview(null);
      setSwissPreview(null);
      setCutPreview(null);
    });
  }

  async function setDropped(player: SeasonParticipantRow, dropped: boolean) {
    if (!ctx) return;
    await runStep(
      dropped
        ? `${player.displayName} dropped: not paired in later rounds.`
        : `${player.displayName} is back in the pairings.`,
      async () => {
        await bffFetch(`/v1/seasons/${ctx.seasonId}/participants/${player.id}/drop`, {
          method: "POST",
          body: JSON.stringify({ dropped }),
        });
        setSwissPreview(null);
      },
    );
  }

  async function confirmFixture(fixture: FixtureView, startAt?: string) {
    const fromInput = confirmTimes[fixture.id];
    const confirmedStartAt =
      startAt ?? (fromInput ? new Date(fromInput).toISOString() : null);
    if (!confirmedStartAt) {
      setError("Pick a time, or wait for the players to agree one.");
      return;
    }
    await runStep(
      `Confirmed ${fixture.participantADisplayName} vs ${fixture.participantBDisplayName} — it's on the public calendar.`,
      async () => {
        await bffFetch(`/v1/fixtures/${fixture.id}/confirm`, {
          method: "POST",
          body: JSON.stringify({ confirmedStartAt }),
        });
      },
    );
  }

  async function finalizeFixture(fixtureId: string, games?: ResultGame[]) {
    await runStep("Result finalised — standings updated.", async () => {
      await bffFetch(`/v1/fixtures/${fixtureId}/results/finalize`, {
        method: "POST",
        body: JSON.stringify(games ? { games } : {}),
      });
    });
  }

  async function enterResult(fixtureId: string, games: ResultGame[]) {
    await runStep("Result entered — standings updated.", async () => {
      await bffFetch(`/v1/fixtures/${fixtureId}/results/enter`, {
        method: "POST",
        body: JSON.stringify({ games }),
      });
    });
  }

  async function completeEvent() {
    if (!ctx) return;
    if (
      !(await confirm({
        title: `End ${ctx.seasonName}?`,
        body: "Its table becomes final and it moves to past events. Dates and results can't change afterwards.",
        confirmLabel: "End event",
      }))
    ) {
      return;
    }
    await runStep(`${ctx.seasonName} has ended — it's on Past events.`, async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/complete`, {
        method: "POST",
        body: "{}",
      });
    });
  }

  async function reopenEvent() {
    if (
      !ctx ||
      !(await confirm({ title: `Reopen ${ctx.seasonName}?`, confirmLabel: "Reopen" }))
    )
      return;
    await runStep(`${ctx.seasonName} is open again.`, async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/reopen`, {
        method: "POST",
        body: "{}",
      });
    });
  }

  async function addOrganiser() {
    if (!groupId || !organiserEmail.trim()) return;
    await runStep(`Added ${organiserEmail.trim()} as an event organiser.`, async () => {
      await bffFetch(`/v1/competitions/${groupId}/organisers`, {
        method: "POST",
        body: JSON.stringify({ email: organiserEmail.trim() }),
      });
      setOrganiserEmail("");
    });
  }

  async function removeOrganiser(member: GroupStaffMember) {
    if (
      !groupId ||
      !(await confirm({
        title: `Remove ${member.displayName}?`,
        body: "They stop being an event organiser in this group.",
        confirmLabel: "Remove",
        danger: true,
      }))
    )
      return;
    await runStep(`Removed ${member.displayName}.`, async () => {
      await bffFetch(
        `/v1/competitions/${groupId}/organisers/${member.customerAccountId}`,
        {
          method: "DELETE",
        },
      );
    });
  }

  async function addStream(fixtureId: string) {
    const url = streamUrls[fixtureId];
    if (!url) return;
    await runStep("Stream link added.", async () => {
      await bffFetch(`/v1/fixtures/${fixtureId}/streams`, {
        method: "POST",
        body: JSON.stringify({ url, visibility: "public" }),
      });
    });
  }

  async function rebuildStandings() {
    if (!ctx) return;
    await runStep("Standings rebuilt.", async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/standings/rebuild`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    });
  }

  async function postponeFixture(fixtureId: string) {
    if (
      !(await confirm({
        title: "Postpone this match?",
        body: "Its time is kept; it shows as postponed until you set it again.",
        confirmLabel: "Postpone",
      }))
    )
      return;
    await runStep("Fixture postponed.", async () => {
      await bffFetch(`/v1/fixtures/${fixtureId}/postpone`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    });
  }

  async function cancelFixture(fixtureId: string) {
    if (
      !(await confirm({
        title: "Cancel this match?",
        body: "It leaves the calendar and any logged result is dropped. This can't be undone.",
        confirmLabel: "Cancel match",
        cancelLabel: "Keep it",
        danger: true,
      }))
    )
      return;
    await runStep("Fixture cancelled.", async () => {
      await bffFetch(`/v1/fixtures/${fixtureId}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    });
  }

  async function correctFixture(fixture: FixtureView, games: ResultGame[]) {
    if (
      !(await confirm({
        title: "Correct this result?",
        body: "The final result is replaced and the standings rebuild.",
        confirmLabel: "Correct result",
      }))
    )
      return;
    await runStep("Result corrected and standings updated.", async () => {
      await bffFetch(`/v1/fixtures/${fixture.id}/results/correct`, {
        method: "POST",
        body: JSON.stringify({ games }),
      });
    });
  }

  async function addRosterPlayer() {
    if (!ctx || !rosterName.trim()) return;
    await runStep(`Added ${rosterName.trim()} to the roster.`, async () => {
      await bffFetch(`/v1/seasons/${ctx.seasonId}/participants`, {
        method: "POST",
        body: JSON.stringify({
          displayName: rosterName.trim(),
          onlineClientUsername: rosterUsername.trim() || null,
          masterDuelId: rosterMasterDuelId.replace(/[\s-]/g, "") || null,
          role: "participant",
          enrollmentMode: "roster_only",
        }),
      });
      setRosterName("");
      setRosterUsername("");
      setRosterMasterDuelId("");
    });
  }

  async function sendInvitation() {
    if (!ctx || !inviteEmail.trim() || !inviteName.trim()) return;
    await runStep(`Invitation made for ${inviteEmail.trim()}.`, async () => {
      const invitation = await bffFetch<{
        email: string;
        token: string;
        acceptUrl: string;
        delivery?: "emailed" | "has_account" | "failed" | "off";
      }>(`/v1/seasons/${ctx.seasonId}/invitations`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          displayName: inviteName.trim(),
          role: "participant",
        }),
      });
      setLastInvitation({
        email: invitation.email,
        token: invitation.token,
        acceptUrl: invitation.acceptUrl,
        delivery: invitation.delivery,
      });
      setInviteEmail("");
      setInviteName("");
      const emails = await bffFetch<{
        items: Array<{
          to: string;
          subject: string;
          acceptUrl: string;
          createdAt: string;
        }>;
      }>(`/v1/seasons/${ctx.seasonId}/invitation-emails`);
      setInvitationEmails(emails.items);
    });
  }

  return {
    ctx,
    setCtx,
    seasons,
    setSeasons,
    staff,
    setStaff,
    organiserEmail,
    setOrganiserEmail,
    formatPlan,
    setFormatPlan,
    formatPreview,
    setFormatPreview,
    fixtures,
    setFixtures,
    setMessage,
    setError,
    busy,
    loaded,
    setBusy,
    confirmTimes,
    setConfirmTimes,
    streamUrls,
    setStreamUrls,
    generationMode,
    setGenerationMode,
    manualRounds,
    setManualRounds,
    generationPreview,
    setGenerationPreview,
    swiss,
    setSwiss,
    swissPreview,
    setSwissPreview,
    bracket,
    setBracket,
    seedOrder,
    setSeedOrder,
    thirdPlace,
    setThirdPlace,
    bracketPreview,
    setBracketPreview,
    cutPreview,
    setCutPreview,
    inviteEmail,
    setInviteEmail,
    inviteName,
    setInviteName,
    lastInvitation,
    setLastInvitation,
    invitationEmails,
    setInvitationEmails,
    rosterPlayers,
    setRosterPlayers,
    rosterName,
    setRosterName,
    candidates,
    setCandidates,
    schedule,
    setSchedule,
    scheduleDraft,
    setScheduleDraft,
    candidateQuery,
    setCandidateQuery,
    editing,
    setEditing,
    rosterUsername,
    setRosterUsername,
    rosterMasterDuelId,
    setRosterMasterDuelId,
    linking,
    setLinking,
    merging,
    setMerging,
    isMasterDuel,
    onlineNameLabel,
    router,
    searchParams,
    groups,
    groupId,
    group,
    isMain,
    seasonIdParam,
    approvals,
    currentSeason,
    ended,
    refresh,
    session,
    authLoading,
    access,
    accessLoading,
    select,
    runStep,
    previewGeneration,
    commitGeneration,
    previewSwissRound,
    commitSwissRound,
    moveSeed,
    shuffleSeeds,
    previewBracket,
    makeBracket,
    previewTopCut,
    makeTopCut,
    addByEmail,
    confirmRoundTimes,
    saveSchedule,
    saveRename,
    requestLink,
    mergePlayer,
    cancelLinkRequest,
    unlinkPlayer,
    removePlayer,
    setDropped,
    confirmFixture,
    finalizeFixture,
    enterResult,
    completeEvent,
    reopenEvent,
    addOrganiser,
    removeOrganiser,
    addStream,
    rebuildStandings,
    postponeFixture,
    cancelFixture,
    correctFixture,
    addRosterPlayer,
    sendInvitation,
    tab,
    toast,
    confirm,
  };
}

export type Board = ReturnType<typeof useOrganizerBoard>;
