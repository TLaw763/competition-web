"use client";

import { buttonVariants } from "../../components/ui/button";

import Link from "next/link";
import { Suspense } from "react";
import { CardListNotices } from "../../components/card-list-updates";
import { PanelsSkeleton } from "../../components/skeleton";
import { GROUP_ROLE_LABEL } from "../../lib/access";
import { OverviewTab } from "./_board/overview-tab";
import { RosterTab } from "./_board/roster-tab";
import { RoundsTab } from "./_board/rounds-tab";
import { ScheduleTab } from "./_board/schedule-tab";
import { SettingsTab } from "./_board/settings-tab";
import { BOARD_TABS, useOrganizerBoard, type BoardTab } from "./_board/use-board";

export default function OrganizerPage() {
  return (
    <Suspense fallback={<PanelsSkeleton label="Loading organizer board…" />}>
      <OrganizerBoard />
    </Suspense>
  );
}

function OrganizerBoard() {
  const board = useOrganizerBoard();
  const {
    access,
    accessLoading,
    approvals,
    authLoading,
    ctx,
    group,
    groupId,
    groups,
    isMain,
    seasons,
    select,
    session,
    tab: requested,
  } = board;
  // The roster is the main organiser's; others land on Overview.
  const tabs = BOARD_TABS.filter((t) => t.id !== "roster" || isMain);
  const tab: BoardTab = tabs.some((t) => t.id === requested) ? requested : "overview";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Organizer board
        </h1>
        <p className="text-sm text-muted-foreground">
          Confirm agreed times, finalise results, and run your event groups.
        </p>
      </div>

      {authLoading || (session && accessLoading) ? (
        <PanelsSkeleton label="Loading organizer board…" />
      ) : !session ? (
        <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm">
          <p>Sign in as an organiser to manage your events.</p>
          <Link
            href="/login"
            className={buttonVariants({ className: "inline-block no-underline" })}
          >
            Sign in
          </Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm">
          <p>You're not an organiser of any event group.</p>
          {access?.platformAdmin ? (
            <Link
              href="/admin"
              className={buttonVariants({ className: "inline-block no-underline" })}
            >
              Create an event group
            </Link>
          ) : (
            <p className="text-muted-foreground">
              Event groups are set up by the platform admin, who appoints their main
              organiser. The main organiser can then add you as an event organiser.
            </p>
          )}
        </div>
      ) : (
        <>
          <CardListNotices />
          <div className="rounded-lg border bg-muted/50 flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-foreground">
              Event group
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                value={groupId ?? ""}
                onChange={(e) => select({ groupId: e.target.value })}
              >
                {groups.map((g) => (
                  <option key={g.competitionId} value={g.competitionId}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            {seasons.length > 0 ? (
              <label className="flex flex-col gap-1 text-foreground">
                Event
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  value={ctx?.seasonId ?? ""}
                  onChange={(e) => select({ seasonId: e.target.value })}
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.status === "completed" ? " (ended)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="text-muted-foreground sm:ml-auto">
              {group ? <p>You: {GROUP_ROLE_LABEL[group.role]}</p> : null}
              {ctx ? <p>Timezone: {ctx.timezone}</p> : null}
            </div>
          </div>

          <nav
            className="flex gap-1 overflow-x-auto border-b border-border"
            role="tablist"
            aria-label="Organizer board"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="board-panel"
                className="-mb-px whitespace-nowrap border-b-2 border-transparent px-2 py-2 text-sm font-medium text-muted-foreground no-underline hover:text-foreground aria-selected:border-primary aria-selected:text-foreground sm:px-3"
                onClick={() => select({ tab: t.id })}
              >
                {t.label}
                {t.id === "overview" && approvals.length ? (
                  <span
                    className="count-badge"
                    aria-label={`${approvals.length} waiting`}
                  >
                    {approvals.length}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <div
            id="board-panel"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className="space-y-6"
          >
            {!board.loaded ? (
              <PanelsSkeleton label="Loading the event…" panels={2} />
            ) : null}
            {board.loaded && tab === "overview" ? <OverviewTab board={board} /> : null}
            {board.loaded && tab === "roster" ? <RosterTab board={board} /> : null}
            {board.loaded && tab === "rounds" ? <RoundsTab board={board} /> : null}
            {board.loaded && tab === "schedule" ? <ScheduleTab board={board} /> : null}
            {board.loaded && tab === "settings" ? <SettingsTab board={board} /> : null}
          </div>
        </>
      )}
    </section>
  );
}
