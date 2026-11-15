"use client";

import { buttonVariants } from "../../../components/ui/button";

import { AllowedEmailsPanel } from "../../../components/allowed-emails";
import { BrandingPanel } from "../../../components/branding-panel";
import { CardListPanel } from "../../../components/card-list-panel";
import { RegistrationPanel } from "../../../components/event-registration";
import { GamePanel } from "../../../components/game-panel";
import { VisibilityPanel } from "../../../components/visibility-panel";
import type { Board } from "./use-board";

/** Settings: the group's organisers and allowed emails, and the event's format plan. */
export function SettingsTab({ board }: { board: Board }) {
  const {
    ctx,
    staff,
    organiserEmail,
    setOrganiserEmail,
    formatPlan,
    formatPreview,
    busy,
    swiss,
    groupId,
    isMain,
    group,
    addOrganiser,
    removeOrganiser,
    seasons,
    refresh,
  } = board;
  const season = seasons.find((s) => s.id === ctx?.seasonId);
  return (
    <>
      {ctx && season ? (
        <GamePanel
          seasonId={ctx.seasonId}
          seasonName={ctx.seasonName}
          game={season.game}
          canSet={isMain}
          onSet={refresh}
        />
      ) : null}

      {ctx && season ? (
        <VisibilityPanel
          seasonId={ctx.seasonId}
          seasonName={ctx.seasonName}
          visibility={season.visibility ?? "public"}
          canSet={isMain}
          onSet={refresh}
        />
      ) : null}

      {ctx && season ? (
        <RegistrationPanel
          seasonId={ctx.seasonId}
          seasonName={ctx.seasonName}
          timezone={ctx.timezone}
        />
      ) : null}

      {ctx && season?.game ? (
        <CardListPanel seasonId={ctx.seasonId} game={season.game} />
      ) : null}

      {groupId && group && isMain ? (
        <BrandingPanel
          groupId={groupId}
          groupName={group.name}
          seasonId={ctx?.seasonId ?? null}
          seasonName={ctx?.seasonName ?? null}
        />
      ) : null}

      {groupId ? (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Organisers</h2>
            <p className="text-sm text-muted-foreground">
              Event organisers confirm times and finalise results in every event of this
              group.
              {isMain ? " Only the platform admin can change the main organiser." : ""}
            </p>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {staff.map((member) => (
              <li
                key={member.customerAccountId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-foreground">{member.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.role === "main_organiser"
                      ? "Main organiser"
                      : "Event organiser"}
                    {member.email ? ` · ${member.email}` : ""}
                  </p>
                </div>
                {isMain && member.role === "organiser" ? (
                  <button
                    type="button"
                    className={buttonVariants({ variant: "outline" })}
                    disabled={busy}
                    onClick={() => void removeOrganiser(member)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {isMain ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1 text-sm text-foreground">
                Add an event organiser by email
                <input
                  type="email"
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  value={organiserEmail}
                  onChange={(e) => setOrganiserEmail(e.target.value)}
                  placeholder="They need to have signed in once"
                />
              </label>
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                disabled={busy || !organiserEmail.trim()}
                onClick={() => void addOrganiser()}
              >
                Add organiser
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {groupId && isMain ? (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
          <h2 className="text-lg font-semibold text-foreground">Allowed emails</h2>
          <AllowedEmailsPanel
            path={`/v1/competitions/${groupId}/allowed-emails`}
            description="People who may create an Enigmic account without an event invitation, e.g. an event organiser you're about to add. Enigmic accounts email them a sign-up link."
          />
        </section>
      ) : null}

      {ctx && formatPreview ? (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Format plan</h2>
            <p className="text-sm text-muted-foreground">{formatPreview.templateLabel}</p>
          </div>
          <ul className="space-y-2 text-sm">
            {formatPreview.phases.map((phase) => (
              <li key={phase.sequence} className="rounded-lg border bg-muted/50 p-3">
                <p className="font-medium text-foreground">
                  {phase.label}
                  {phase.automationStatus === "available" ? (
                    <span className="ml-2 text-xs font-normal text-success">Ready</span>
                  ) : (
                    <span className="ml-2 text-xs font-normal text-warning">Planned</span>
                  )}
                </p>
                <p className="mt-1 text-muted-foreground">{phase.summary}</p>
              </li>
            ))}
          </ul>
          {formatPlan?.template === "league" ? (
            <p className="text-xs text-muted-foreground">
              Enroll at least two players, then use Generate fixtures under Rounds &
              results.
            </p>
          ) : swiss ? (
            <p className="text-xs text-muted-foreground">
              Enroll the players, then pair each round under Rounds & results.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Enroll the players, then seed and make the bracket under Rounds & results.
            </p>
          )}
        </section>
      ) : null}
    </>
  );
}
