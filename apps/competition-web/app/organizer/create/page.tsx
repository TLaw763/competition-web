"use client";

import { buttonVariants } from "../../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { canRunGroup, useAccess } from "../../../lib/access";
import { bffFetch } from "../../../lib/bff-client";
import {
  FORMAT_TEMPLATE_OPTIONS,
  type FormatTemplateId,
} from "../../../lib/format-templates";
import { GAMES, gameInfo, type EventGame } from "../../../lib/games";
import type { FormatPlanPreview } from "../../../lib/types";
import {
  EMPTY_SCHEDULE,
  ScheduleFields,
  scheduleDraftValid,
  schedulePayload,
  type ScheduleDraft,
} from "../../../components/schedule-fields";

type WizardStep = "basics" | "game" | "format" | "configure" | "players" | "review";

type RosterDraft = { displayName: string; onlineClientUsername: string; email: string };

const emptyRow = (n: number): RosterDraft => ({
  displayName: `Player ${n}`,
  onlineClientUsername: "",
  email: "",
});

type WizardForm = {
  seasonName: string;
  /** Required; fixed once the event is created. */
  game: EventGame | null;
  template: FormatTemplateId;
  leagueMode: "single_round_robin" | "double_round_robin" | "manual";
  swissRounds: number;
  cutSize: number;
  bracketSize: number;
  bracketStyle: "single_elimination" | "double_elimination";
  rosterPlayers: RosterDraft[];
  schedule: ScheduleDraft;
  /** Platform admin: a manual league filled by the import on the board. */
  importAfter: boolean;
};

const DEFAULT_FORM: WizardForm = {
  seasonName: "",
  game: null,
  template: "league",
  leagueMode: "single_round_robin",
  swissRounds: 5,
  cutSize: 8,
  bracketSize: 8,
  bracketStyle: "single_elimination",
  rosterPlayers: [],
  schedule: EMPTY_SCHEDULE,
  importAfter: false,
};

const STEPS: WizardStep[] = [
  "basics",
  "game",
  "format",
  "configure",
  "players",
  "review",
];

export default function CreateEventPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <CreateEvent />
    </Suspense>
  );
}

/** Main organiser (or platform admin): a new event in one of their event groups (D-058). */
function CreateEvent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const { access, loading: accessLoading } = useAccess();
  const runnableGroups = (access?.groups ?? []).filter((g) => canRunGroup(g.role));
  const [groupId, setGroupId] = useState<string | null>(searchParams.get("groupId"));
  const group =
    runnableGroups.find((g) => g.competitionId === groupId) ?? runnableGroups[0] ?? null;
  const [step, setStep] = useState<WizardStep>("basics");
  const [form, setForm] = useState<WizardForm>(DEFAULT_FORM);
  const [preview, setPreview] = useState<FormatPlanPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playerCount, setPlayerCount] = useState(8);

  const stepIndex = STEPS.indexOf(step);

  const payload = useMemo(
    () => ({
      seasonName: form.seasonName.trim(),
      ...schedulePayload(form.schedule),
      ...(form.game ? { game: form.game } : {}),
      template: form.template,
      leagueMode: form.template === "league" ? form.leagueMode : undefined,
      swissRounds:
        form.template === "swiss" || form.template === "hybrid_swiss_cut"
          ? form.swissRounds
          : undefined,
      cutSize: form.template === "hybrid_swiss_cut" ? form.cutSize : undefined,
      bracketSize: form.template === "bracket" ? form.bracketSize : undefined,
      bracketStyle:
        form.template === "bracket" || form.template === "hybrid_swiss_cut"
          ? form.bracketStyle
          : undefined,
      rosterPlayers: form.rosterPlayers
        .filter((p) => p.displayName.trim())
        .map((p) => ({
          displayName: p.displayName.trim(),
          onlineClientUsername: p.onlineClientUsername.trim() || null,
          email: p.email.trim() || null,
        })),
    }),
    [form],
  );

  useEffect(() => {
    if (step !== "review") return;
    let cancelled = false;
    void bffFetch<FormatPlanPreview>("/v1/competitions/format-preview", {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setPreview(null);
          setError(e instanceof Error ? e.message : "Preview failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [step, payload]);

  function update<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === "basics") {
      return (
        group !== null &&
        form.seasonName.trim().length > 0 &&
        scheduleDraftValid(form.schedule)
      );
    }
    if (step === "game") return form.game !== null;
    if (step === "format") return true;
    if (step === "configure") {
      if (form.template === "hybrid_swiss_cut") {
        return form.swissRounds >= 1 && form.swissRounds <= 15 && form.cutSize >= 2;
      }
      if (form.template === "swiss") {
        return form.swissRounds >= 1 && form.swissRounds <= 15;
      }
      if (form.template === "bracket") return form.bracketSize >= 2;
      return true;
    }
    if (step === "players") return true;
    return true;
  }

  async function createEvent() {
    if (!group) return;
    setBusy(true);
    setError(null);
    try {
      const result = await bffFetch<{
        season: { id: string };
      }>(`/v1/competitions/${group.competitionId}/seasons/wizard`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const importing = form.template === "league" && form.importAfter;
      router.push(
        `/organizer?groupId=${encodeURIComponent(group.competitionId)}&seasonId=${encodeURIComponent(result.season.id)}${importing ? "&tab=rounds#import" : ""}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || (session && accessLoading)) {
    return <p className="text-sm text-muted-foreground">Loading session…</p>;
  }

  if (!session) {
    return (
      <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm">
        <p>Sign in as a main organiser to create an event.</p>
        <Link
          href="/login"
          className={buttonVariants({ className: "inline-block no-underline" })}
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (runnableGroups.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm">
        <p>Only a group's main organiser creates its events.</p>
        <Link href="/organizer" className="font-medium">
          ← Organizer board
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/organizer" className="text-sm font-medium text-muted-foreground">
          ← Organizer board
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Create event
        </h1>
        <p className="text-sm text-muted-foreground">
          A new event in your event group: its format, then players.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Wizard progress">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1 ${
              s === step
                ? "bg-accent font-semibold text-foreground"
                : i < stepIndex
                  ? "bg-muted text-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}. {stepLabel(s)}
          </li>
        ))}
      </ol>

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

      <div className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5">
        {step === "basics" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Basics</h2>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              Event group
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                value={group?.competitionId ?? ""}
                onChange={(e) => setGroupId(e.target.value)}
              >
                {runnableGroups.map((g) => (
                  <option key={g.competitionId} value={g.competitionId}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              Event name
              <input
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                value={form.seasonName}
                onChange={(e) => update("seasonName", e.target.value)}
                placeholder="e.g. Spring League 2027"
              />
            </label>
            <ScheduleFields
              value={form.schedule}
              onChange={(next) => update("schedule", next)}
            />
          </>
        ) : null}

        {step === "game" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Game</h2>
            <p className="text-sm text-muted-foreground">
              Which game is this event played in? It sets the event&apos;s logo (unless
              you add your own) and whether it shows a Ban List or a Genesys Points List.
              It can&apos;t be changed after the event is created.
            </p>
            <div
              className="grid gap-3 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Game"
            >
              {GAMES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={form.game === option.id}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition ${
                    form.game === option.id
                      ? "border-primary bg-accent"
                      : "border-border bg-muted hover:border-input"
                  }`}
                  onClick={() => update("game", option.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={option.logo}
                    alt=""
                    className="h-16 w-full rounded-md bg-white object-contain p-1"
                  />
                  <span className="font-semibold text-foreground">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.summary}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === "format" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Competition format</h2>
            <p className="text-sm text-muted-foreground">
              Choose the structure: a league, Swiss rounds, an elimination bracket, or
              Swiss rounds then a top cut into a bracket.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FORMAT_TEMPLATE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`rounded-lg border p-4 text-left transition ${
                    form.template === option.id
                      ? "border-primary bg-accent"
                      : "border-border bg-muted hover:border-input"
                  }`}
                  onClick={() => update("template", option.id)}
                >
                  <p className="font-semibold text-foreground">{option.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{option.summary}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{option.detail}</p>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === "configure" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Format details</h2>
            {form.template === "league" ? (
              <fieldset className="space-y-2 text-sm text-foreground">
                <legend className="font-medium">League type</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="leagueMode"
                    checked={form.leagueMode === "single_round_robin"}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        leagueMode: "single_round_robin",
                        importAfter: false,
                      }))
                    }
                  />
                  Single round-robin — each player meets every opponent once
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="leagueMode"
                    checked={form.leagueMode === "double_round_robin"}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        leagueMode: "double_round_robin",
                        importAfter: false,
                      }))
                    }
                  />
                  Double round-robin — home and away
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="leagueMode"
                    checked={form.leagueMode === "manual" && !form.importAfter}
                    onChange={() =>
                      setForm((f) => ({ ...f, leagueMode: "manual", importAfter: false }))
                    }
                  />
                  Manual schedule — define rounds when importing from another platform
                </label>
                {access?.platformAdmin ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="leagueMode"
                      checked={form.importAfter}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          leagueMode: "manual",
                          importAfter: true,
                        }))
                      }
                    />
                    Import — fixtures and results from a CSV or md-league, on the board
                    after you create the event
                  </label>
                ) : null}
              </fieldset>
            ) : null}

            {form.template === "swiss" || form.template === "hybrid_swiss_cut" ? (
              <label className="flex flex-col gap-1 text-sm text-foreground">
                Swiss rounds
                <input
                  type="number"
                  min={1}
                  max={15}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 max-w-32"
                  value={form.swissRounds}
                  onChange={(e) => update("swissRounds", Number(e.target.value))}
                />
              </label>
            ) : null}

            {form.template === "hybrid_swiss_cut" ? (
              <label className="flex flex-col gap-1 text-sm text-foreground">
                Top cut size
                <input
                  type="number"
                  min={2}
                  max={512}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 max-w-32"
                  value={form.cutSize}
                  onChange={(e) => update("cutSize", Number(e.target.value))}
                />
                <span className="text-xs text-muted-foreground">
                  Players above this rank after Swiss enter the bracket (8, 16, or 32
                  typical).
                </span>
              </label>
            ) : null}

            {form.template === "bracket" ? (
              <label className="flex flex-col gap-1 text-sm text-foreground">
                Bracket size
                <input
                  type="number"
                  min={2}
                  max={512}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 max-w-32"
                  value={form.bracketSize}
                  onChange={(e) => update("bracketSize", Number(e.target.value))}
                />
              </label>
            ) : null}

            {form.template === "bracket" || form.template === "hybrid_swiss_cut" ? (
              // Double elimination stays hidden until it's built (formats plan 3b).
              <p className="text-sm text-muted-foreground">
                Bracket style: single elimination. Double elimination is coming later.
              </p>
            ) : null}
          </>
        ) : null}

        {step === "players" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Players (optional)</h2>
            <p className="text-sm text-muted-foreground">
              Add players now, or skip and add them later on the organizer board.
              Placeholder names (&ldquo;Player 3&rdquo;) can be renamed on the board. With
              an email, a player with an account is linked straight away; anyone else is
              emailed an invitation and linked when they sign in.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-sm text-foreground">
                Number of players
                <input
                  type="number"
                  min={1}
                  max={256}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-28"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                disabled={!(playerCount >= 1 && playerCount <= 256)}
                onClick={() =>
                  setForm((prev) => {
                    // Exactly N rows: the rows already there first, then new placeholders.
                    const rows = prev.rosterPlayers.slice(0, Math.max(playerCount, 0));
                    for (let n = rows.length + 1; n <= playerCount; n++)
                      rows.push(emptyRow(n));
                    return { ...prev, rosterPlayers: rows };
                  })
                }
              >
                Set players
              </button>
              {form.rosterPlayers.length ? (
                <span className="text-sm text-muted-foreground">
                  {form.rosterPlayers.length} row
                  {form.rosterPlayers.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              {form.rosterPlayers.map((player, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 border-b border-border pb-2 sm:flex-row sm:items-end sm:border-0 sm:pb-0"
                >
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-foreground">
                    Display name
                    <input
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-full min-w-0"
                      value={player.displayName}
                      onChange={(e) => {
                        const next = [...form.rosterPlayers];
                        next[index] = { ...next[index]!, displayName: e.target.value };
                        setForm((prev) => ({ ...prev, rosterPlayers: next }));
                      }}
                    />
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-foreground">
                    Email (optional, invites)
                    <input
                      type="email"
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-full min-w-0"
                      value={player.email}
                      onChange={(e) => {
                        const next = [...form.rosterPlayers];
                        next[index] = { ...next[index]!, email: e.target.value };
                        setForm((prev) => ({ ...prev, rosterPlayers: next }));
                      }}
                    />
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-foreground">
                    Online username (optional)
                    <input
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-full min-w-0"
                      value={player.onlineClientUsername}
                      onChange={(e) => {
                        const next = [...form.rosterPlayers];
                        next[index] = {
                          ...next[index]!,
                          onlineClientUsername: e.target.value,
                        };
                        setForm((prev) => ({ ...prev, rosterPlayers: next }));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className={buttonVariants({ variant: "outline" })}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        rosterPlayers: prev.rosterPlayers.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  rosterPlayers: [
                    ...prev.rosterPlayers,
                    emptyRow(prev.rosterPlayers.length + 1),
                  ],
                }))
              }
            >
              Add player row
            </button>
          </>
        ) : null}

        {step === "review" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Review</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Event group</dt>
                <dd className="font-medium text-foreground">{group?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Event</dt>
                <dd className="font-medium text-foreground">{form.seasonName || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Game</dt>
                <dd className="font-medium text-foreground">
                  {gameInfo(form.game)?.label ?? "—"}
                  <span className="block text-xs font-normal text-muted-foreground">
                    Can&apos;t be changed after the event is created.
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Roster</dt>
                <dd className="text-foreground">
                  {form.rosterPlayers.filter((p) => p.displayName.trim()).length
                    ? form.rosterPlayers
                        .filter((p) => p.displayName.trim())
                        .map((p) => p.displayName.trim())
                        .join(", ")
                    : "None yet — add on organizer board"}
                  {form.rosterPlayers.some((p) => p.email.trim()) ? (
                    <span className="block text-muted-foreground">
                      {form.rosterPlayers.filter((p) => p.email.trim()).length} with an
                      email (linked or invited when you create the event)
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
            {preview ? (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="font-medium text-foreground">{preview.templateLabel}</p>
                <ul className="space-y-3">
                  {preview.phases.map((phase) => (
                    <li
                      key={phase.sequence}
                      className="rounded-lg border bg-muted/50 p-3 text-sm"
                    >
                      <p className="font-semibold text-foreground">
                        Phase {phase.sequence}: {phase.label}
                        {phase.automationStatus === "available" ? (
                          <span className="ml-2 text-xs font-normal text-success">
                            Ready to generate
                          </span>
                        ) : (
                          <span className="ml-2 text-xs font-normal text-warning">
                            Planned
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-muted-foreground">{phase.summary}</p>
                    </li>
                  ))}
                </ul>
                {preview.notes.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {preview.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading preview…</p>
            )}
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          disabled={stepIndex === 0 || busy}
          onClick={() => setStep(STEPS[stepIndex - 1]!)}
        >
          Back
        </button>
        {step !== "review" ? (
          <button
            type="button"
            className={buttonVariants()}
            disabled={!canAdvance()}
            onClick={() => setStep(STEPS[stepIndex + 1]!)}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className={buttonVariants()}
            disabled={busy || !preview}
            onClick={() => void createEvent()}
          >
            Create event
          </button>
        )}
      </div>
    </section>
  );
}

function stepLabel(step: WizardStep): string {
  switch (step) {
    case "basics":
      return "Basics";
    case "game":
      return "Game";
    case "format":
      return "Format";
    case "configure":
      return "Details";
    case "players":
      return "Players";
    case "review":
      return "Review";
  }
}
