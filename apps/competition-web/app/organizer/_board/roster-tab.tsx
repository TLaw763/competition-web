"use client";

import { buttonVariants } from "../../../components/ui/button";

import Link from "next/link";
import { useState } from "react";
import { AddSelfButton, JoinRequestsPanel } from "../../../components/event-registration";
import { formatMasterDuelId, isMasterDuelIdInput } from "../../../lib/games";
import type { RosterCandidate, SeasonParticipantRow } from "../../../lib/types";
import type { Board } from "./use-board";

/** Roster (main organiser): add, invite, rename, link to accounts, drop and remove players. */
export function RosterTab({ board }: { board: Board }) {
  const {
    ctx,
    busy,
    swiss,
    inviteEmail,
    setInviteEmail,
    inviteName,
    setInviteName,
    lastInvitation,
    invitationEmails,
    rosterPlayers,
    rosterName,
    setRosterName,
    candidates,
    candidateQuery,
    setCandidateQuery,
    editing,
    setEditing,
    rosterUsername,
    setRosterUsername,
    isMain,
    ended,
    addByEmail,
    saveRename,
    rosterMasterDuelId,
    setRosterMasterDuelId,
    linking,
    setLinking,
    isMasterDuel,
    onlineNameLabel,
    requestLink,
    merging,
    setMerging,
    mergePlayer,
    cancelLinkRequest,
    unlinkPlayer,
    removePlayer,
    setDropped,
    addRosterPlayer,
    sendInvitation,
    refresh,
  } = board;
  // Players an account added by mistake as a new player could really be.
  const rosterOnly = rosterPlayers.filter(
    (p) => p.platformAccess !== "platform" && !p.linkRequest,
  );
  return (
    <>
      {ctx && !ended ? (
        <JoinRequestsPanel seasonId={ctx.seasonId} onDecided={refresh} />
      ) : null}
      {ctx && isMain ? (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Roster</h2>
            <p className="text-sm text-muted-foreground">
              Add players by name for fixtures, standings, and public schedules.
              Roster-only players do not need an account — they appear on the league but
              cannot use My fixtures until you link them to their Enigmic account (Link
              account on their row; they accept it on their Account page).
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex flex-col gap-1 text-sm text-foreground">
              Display name
              <input
                type="text"
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                value={rosterName}
                onChange={(e) => setRosterName(e.target.value)}
                placeholder="e.g. Alex Chen"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              {onlineNameLabel} (optional)
              <input
                type="text"
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                value={rosterUsername}
                onChange={(e) => setRosterUsername(e.target.value)}
                placeholder="e.g. alex-md"
              />
            </label>
            {isMasterDuel ? (
              <label className="flex flex-col gap-1 text-sm text-foreground">
                Master Duel ID (optional)
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  value={rosterMasterDuelId}
                  aria-invalid={!isMasterDuelIdInput(rosterMasterDuelId)}
                  onChange={(e) => setRosterMasterDuelId(e.target.value)}
                  placeholder="e.g. 123-456-789"
                />
              </label>
            ) : null}
            <button
              type="button"
              className={buttonVariants()}
              disabled={
                busy || !rosterName.trim() || !isMasterDuelIdInput(rosterMasterDuelId)
              }
              onClick={() => void addRosterPlayer()}
            >
              Add player
            </button>
            {!ended ? (
              <AddSelfButton
                seasonId={ctx.seasonId}
                seasonName={ctx.seasonName}
                onJoined={refresh}
              />
            ) : null}
          </div>
          {!ended ? (
            <RosterCandidatesPicker
              candidates={candidates}
              rosterOnly={rosterOnly}
              query={candidateQuery}
              onQuery={setCandidateQuery}
              busy={busy}
              onAdd={(people) => void addByEmail(people)}
            />
          ) : null}
          {rosterPlayers.length > 0 ? (
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {rosterPlayers.map((player) => (
                <li
                  key={player.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  {editing?.id === player.id ? (
                    <form
                      className="flex flex-1 flex-wrap items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveRename();
                      }}
                    >
                      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Name
                        <input
                          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                          value={editing.name}
                          onChange={(e) =>
                            setEditing({ ...editing, name: e.target.value })
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {onlineNameLabel}
                        <input
                          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                          value={editing.username}
                          onChange={(e) =>
                            setEditing({ ...editing, username: e.target.value })
                          }
                        />
                      </label>
                      {isMasterDuel ? (
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                          Master Duel ID
                          <input
                            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                            inputMode="numeric"
                            maxLength={11}
                            placeholder="123-456-789"
                            value={editing.masterDuelId}
                            aria-invalid={!isMasterDuelIdInput(editing.masterDuelId)}
                            onChange={(e) =>
                              setEditing({ ...editing, masterDuelId: e.target.value })
                            }
                          />
                        </label>
                      ) : null}
                      <button
                        type="submit"
                        className={buttonVariants()}
                        disabled={
                          busy ||
                          !editing.name.trim() ||
                          !isMasterDuelIdInput(editing.masterDuelId)
                        }
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={buttonVariants({ variant: "outline" })}
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div>
                      <p className="font-medium text-foreground">{player.displayName}</p>
                      {player.onlineClientUsername ? (
                        <p className="text-xs text-muted-foreground">
                          {onlineNameLabel}: {player.onlineClientUsername}
                        </p>
                      ) : null}
                      {isMasterDuel && player.masterDuelId ? (
                        <p className="text-xs text-muted-foreground">
                          Master Duel ID {formatMasterDuelId(player.masterDuelId)}
                        </p>
                      ) : null}
                      {player.konamiId ? (
                        <p className="text-xs text-muted-foreground">
                          KONAMI ID {player.konamiId}
                        </p>
                      ) : null}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {!ended && editing?.id !== player.id ? (
                      <button
                        type="button"
                        className={buttonVariants({
                          variant: "outline",
                          className: "px-2 py-0.5 text-xs",
                        })}
                        disabled={busy}
                        onClick={() =>
                          setEditing({
                            id: player.id,
                            name: player.displayName,
                            username: player.onlineClientUsername ?? "",
                            masterDuelId: formatMasterDuelId(player.masterDuelId),
                          })
                        }
                      >
                        Edit
                      </button>
                    ) : null}
                    {player.droppedAt ? (
                      <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">
                        Dropped
                      </span>
                    ) : null}
                    {swiss && !ended ? (
                      <button
                        type="button"
                        className={buttonVariants({
                          variant: "outline",
                          className: "px-2 py-0.5 text-xs",
                        })}
                        disabled={busy}
                        onClick={() => void setDropped(player, !player.droppedAt)}
                      >
                        {player.droppedAt ? "Reinstate" : "Drop"}
                      </button>
                    ) : null}
                    {player.platformAccess === "platform" ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                        Platform
                      </span>
                    ) : player.linkRequest ? (
                      <span
                        className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning"
                        title={`Waiting for ${player.linkRequest.email} to accept`}
                      >
                        Link pending
                      </span>
                    ) : player.pendingPlatformInvite ? (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
                        Invite pending
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Roster only
                      </span>
                    )}
                    {ended ? null : player.platformAccess === "platform" ? (
                      <>
                        {rosterOnly.length > 0 && merging?.id !== player.id ? (
                          <button
                            type="button"
                            className={buttonVariants({
                              variant: "outline",
                              className: "px-2 py-0.5 text-xs",
                            })}
                            disabled={busy}
                            title="Added twice? Move this account onto the player already on the roster."
                            onClick={() =>
                              setMerging({ id: player.id, intoId: rosterOnly[0]!.id })
                            }
                          >
                            Merge into…
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={buttonVariants({
                            variant: "outline",
                            className: "px-2 py-0.5 text-xs",
                          })}
                          disabled={busy}
                          onClick={() => void unlinkPlayer(player)}
                        >
                          Unlink
                        </button>
                      </>
                    ) : player.linkRequest ? (
                      <button
                        type="button"
                        className={buttonVariants({
                          variant: "outline",
                          className: "px-2 py-0.5 text-xs",
                        })}
                        disabled={busy}
                        onClick={() => void cancelLinkRequest(player)}
                      >
                        Cancel request
                      </button>
                    ) : linking?.id !== player.id ? (
                      <button
                        type="button"
                        className={buttonVariants({
                          variant: "outline",
                          className: "px-2 py-0.5 text-xs",
                        })}
                        disabled={busy}
                        title="Ask their Enigmic account to confirm they're this player"
                        onClick={() => setLinking({ id: player.id, email: "" })}
                      >
                        Link account
                      </button>
                    ) : null}
                    {/* Main organiser and platform admin only (the API checks too). */}
                    {isMain && !ended && editing?.id !== player.id ? (
                      <button
                        type="button"
                        className={buttonVariants({
                          variant: "outline",
                          className: "px-2 py-0.5 text-xs text-danger",
                        })}
                        disabled={busy}
                        title="Added by mistake? Take them off this event's roster (only before they've played)."
                        onClick={() => void removePlayer(player)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  {player.linkRequest ? (
                    <p className="w-full text-xs text-muted-foreground">
                      Waiting for <strong>{player.linkRequest.email}</strong> to accept on
                      their Account page.
                    </p>
                  ) : null}
                  {merging?.id === player.id ? (
                    <form
                      className="flex w-full flex-wrap items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void mergePlayer(player, merging.intoId);
                      }}
                    >
                      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                        {player.displayName} is really
                        <select
                          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                          value={merging.intoId}
                          onChange={(e) =>
                            setMerging({ ...merging, intoId: e.target.value })
                          }
                        >
                          {rosterOnly.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button type="submit" className={buttonVariants()} disabled={busy}>
                        Merge
                      </button>
                      <button
                        type="button"
                        className={buttonVariants({ variant: "outline" })}
                        onClick={() => setMerging(null)}
                      >
                        Cancel
                      </button>
                      <p className="w-full text-xs text-muted-foreground">
                        For a player added twice: the account moves onto the roster player
                        (in every event of this group) and {player.displayName} is
                        removed.
                      </p>
                    </form>
                  ) : null}
                  {linking?.id === player.id ? (
                    <form
                      className="flex w-full flex-wrap items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void requestLink();
                      }}
                    >
                      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                        Their Enigmic account email
                        <input
                          type="email"
                          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                          autoFocus
                          value={linking.email}
                          onChange={(e) =>
                            setLinking({ ...linking, email: e.target.value })
                          }
                          placeholder="name@example.com"
                        />
                      </label>
                      <button
                        type="submit"
                        className={buttonVariants()}
                        disabled={busy || !linking.email.trim()}
                      >
                        Send link request
                      </button>
                      <button
                        type="button"
                        className={buttonVariants({ variant: "outline" })}
                        onClick={() => setLinking(null)}
                      >
                        Cancel
                      </button>
                      <p className="w-full text-xs text-muted-foreground">
                        They&apos;ll be asked to confirm they&apos;re {player.displayName}
                        . Without an account yet, we email them a sign-up link first.
                      </p>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No players yet — add at least two before generating fixtures.
            </p>
          )}

          <details className="rounded-lg border bg-muted/50 space-y-3 p-4 text-sm">
            <summary className="cursor-pointer font-medium text-foreground">
              Invite to platform (optional)
            </summary>
            <p className="text-muted-foreground">
              We&apos;ll email them a link to create their Enigmic account; once they sign
              in with that email they&apos;re in this event, can use My fixtures and
              submit results. For someone already on the roster, use Link account on their
              row instead.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1 text-sm text-foreground">
                Email
                <input
                  type="email"
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-foreground">
                Display name
                <input
                  type="text"
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                disabled={busy || !inviteEmail.trim() || !inviteName.trim()}
                onClick={() => void sendInvitation()}
              >
                Send invitation
              </button>
            </div>
            {lastInvitation ? (
              <div className="space-y-1">
                <p>
                  {lastInvitation.delivery === "emailed" ? (
                    <>
                      We&apos;ve emailed <strong>{lastInvitation.email}</strong> a link to
                      create their account. They&apos;ll be in the event once they sign
                      in.
                    </>
                  ) : lastInvitation.delivery === "has_account" ? (
                    <>
                      <strong>{lastInvitation.email}</strong> already has an account:
                      they&apos;ll be in the event next time they use Competition Tools.
                    </>
                  ) : (
                    <>
                      Invitation made for <strong>{lastInvitation.email}</strong>.
                    </>
                  )}
                </p>
                {lastInvitation.delivery === "failed" ? (
                  <p
                    className="rounded-md border border-danger/35 bg-danger-soft p-3 text-danger"
                    role="alert"
                  >
                    Enigmic accounts couldn&apos;t be reached, so no email went out and
                    they can&apos;t create an account while sign-up is closed. Send the
                    invitation again in a moment.
                  </p>
                ) : null}
                <details>
                  <summary className="cursor-pointer text-muted-foreground">
                    Invitation link
                  </summary>
                  <p className="break-all">
                    <Link href={lastInvitation.acceptUrl} className="font-medium">
                      {lastInvitation.acceptUrl}
                    </Link>
                  </p>
                </details>
              </div>
            ) : null}
            {invitationEmails.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Invitation links</h3>
                <ul className="space-y-2">
                  {invitationEmails.map((entry) => (
                    <li
                      key={`${entry.to}-${entry.createdAt}`}
                      className="rounded-sm border border-border p-3"
                    >
                      <p>
                        <strong>{entry.to}</strong> — {entry.subject}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">
                        {entry.acceptUrl}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </details>
        </section>
      ) : null}
    </>
  );
}

/** The group's people (allowed emails, earlier players): search, add one, or add all. */
function RosterCandidatesPicker({
  candidates,
  rosterOnly,
  query,
  onQuery,
  busy,
  onAdd,
}: {
  candidates: RosterCandidate[];
  rosterOnly: SeasonParticipantRow[];
  query: string;
  onQuery: (query: string) => void;
  busy: boolean;
  onAdd: (
    people: Array<{ email: string; displayName: string; participantId?: string }>,
  ) => void;
}) {
  // Someone with an account may already be on the roster (e.g. imported by name).
  const [choosing, setChoosing] = useState<{
    email: string;
    participantId: string;
  } | null>(null);
  const available = candidates.filter((c) => !c.inEvent);
  if (candidates.length === 0) return null;
  const q = query.trim().toLowerCase();
  // The name, or the email before the @ ("ali" shouldn't match every "…invalid").
  const matches = available.filter(
    (c) =>
      !q ||
      c.displayName.toLowerCase().includes(q) ||
      (q.includes("@") ? c.email.includes(q) : c.email.split("@")[0]!.includes(q)),
  );
  const person = (c: RosterCandidate) => ({ email: c.email, displayName: c.displayName });
  return (
    <div className="rounded-lg border bg-muted/50 space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label className="flex flex-1 flex-col gap-1 text-foreground">
          Add from your group
          <input
            type="search"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          disabled={busy || available.length === 0}
          onClick={() => onAdd(available.map(person))}
        >
          Add all ({available.length})
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Your group&apos;s allowed emails and players from its earlier events. People with
        an account join straight away; the others are emailed an invitation. Someone
        already on the roster (same name) is asked to confirm instead.
      </p>
      {available.length === 0 ? (
        <p className="text-muted-foreground">
          Everyone from your group is in this event.
        </p>
      ) : (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
          {matches.slice(0, 50).map((c) => (
            <li
              key={c.email}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{c.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{c.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {c.hasAccount ? "Has an account" : "Will be invited"}
                </span>
                {choosing?.email !== c.email ? (
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: "outline",
                      className: "px-2 py-0.5 text-xs",
                    })}
                    disabled={busy}
                    onClick={() =>
                      c.hasAccount && rosterOnly.length > 0
                        ? setChoosing({ email: c.email, participantId: "" })
                        : onAdd([person(c)])
                    }
                  >
                    Add
                  </button>
                ) : null}
              </div>
              {choosing?.email === c.email ? (
                <form
                  className="flex w-full flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onAdd([
                      choosing.participantId
                        ? { ...person(c), participantId: choosing.participantId }
                        : person(c),
                    ]);
                    setChoosing(null);
                  }}
                >
                  <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                    Is {c.displayName} already on the roster?
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                      value={choosing.participantId}
                      onChange={(e) =>
                        setChoosing({ ...choosing, participantId: e.target.value })
                      }
                    >
                      <option value="">No, add as a new player</option>
                      {rosterOnly.map((p) => (
                        <option key={p.id} value={p.id}>
                          Yes, they&apos;re {p.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className={buttonVariants()} disabled={busy}>
                    {choosing.participantId ? "Send link request" : "Add"}
                  </button>
                  <button
                    type="button"
                    className={buttonVariants({ variant: "outline" })}
                    onClick={() => setChoosing(null)}
                  >
                    Cancel
                  </button>
                  {choosing.participantId ? (
                    <p className="w-full text-xs text-muted-foreground">
                      They confirm on their Account page; until then the row shows Link
                      pending.
                    </p>
                  ) : null}
                </form>
              ) : null}
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">
              No one matches &ldquo;{query}&rdquo;.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
