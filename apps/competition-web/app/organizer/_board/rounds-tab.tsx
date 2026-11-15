"use client";

import { buttonVariants } from "../../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";

import { BracketTree } from "../../../components/bracket-view";
import { ImportPanel } from "../../../components/import-panel";
import {
  emptyManualRound,
  ManualFixtureBuilder,
  manualPairingsPayload,
} from "../../../components/manual-fixture-builder";
import { RoundsList } from "./rounds-list";
import type { GenerationMode } from "./use-board";
import type { Board } from "./use-board";

/** Rounds & results: pairing or generating rounds, importing, and every match by round. */
export function RoundsTab({ board }: { board: Board }) {
  const {
    ctx,
    formatPlan,
    setMessage,
    busy,
    generationMode,
    setGenerationMode,
    manualRounds,
    setManualRounds,
    generationPreview,
    setGenerationPreview,
    swiss,
    swissPreview,
    bracket,
    seedOrder,
    thirdPlace,
    setThirdPlace,
    bracketPreview,
    setBracketPreview,
    cutPreview,
    setCutPreview,
    rosterPlayers,
    isMain,
    ended,
    refresh,
    access,
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
    fixtures,
  } = board;
  return (
    <>
      {ctx && swiss ? (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Swiss rounds</h2>
            <p className="text-sm text-muted-foreground">
              {swiss.roundsPaired} of {swiss.roundsTotal} rounds paired · {swiss.players}{" "}
              players in the pairings. Each round is paired from the standings once the
              previous one is finished; nobody meets the same opponent twice if it can be
              avoided.
            </p>
          </div>
          {swiss.currentRound ? (
            <p className="text-sm text-foreground">
              {swiss.currentRound.label}:{" "}
              {swiss.currentRound.openFixtures > 0
                ? `${swiss.currentRound.openFixtures} match${swiss.currentRound.openFixtures === 1 ? "" : "es"} still to finalise or cancel`
                : "finished"}
              {swiss.currentRound.byeParticipantId
                ? ` · bye: ${rosterPlayers.find((p) => p.id === swiss.currentRound!.byeParticipantId)?.displayName ?? "a player"}`
                : ""}
            </p>
          ) : null}
          {swiss.complete ? (
            <p
              className={cn(
                "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
                "text-sm",
              )}
            >
              {bracket?.seededByCut
                ? bracket.created
                  ? "All Swiss rounds are done. The top cut is playing the bracket below."
                  : "All Swiss rounds are done. Make the top cut under Bracket below."
                : "All Swiss rounds are done. The standings are final."}
            </p>
          ) : swiss.reason && !swiss.currentRound?.openFixtures ? (
            <p className="text-sm text-muted-foreground">{swiss.reason}.</p>
          ) : null}
          {isMain && !ended && !swiss.complete ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                disabled={busy || !swiss.canPairNext}
                onClick={() => void previewSwissRound()}
              >
                Pair round {swiss.roundsPaired + 1}
              </button>
              <button
                type="button"
                className={buttonVariants()}
                disabled={busy || !swissPreview}
                onClick={() => void commitSwissRound()}
              >
                Publish {swissPreview?.label ?? "round"}
              </button>
            </div>
          ) : null}
          {swissPreview ? (
            <div className="space-y-3 text-sm">
              {swissPreview.warnings.length ? (
                <ul className="list-disc space-y-1 pl-5 text-warning">
                  {swissPreview.warnings.map((item) => (
                    <li key={item.code}>{item.message}</li>
                  ))}
                </ul>
              ) : null}
              <div className="rounded-md bg-muted p-3">
                <p className="font-semibold text-foreground">
                  {swissPreview.label} of {swissPreview.roundsTotal}
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                  {swissPreview.fixtures.map((fixture) => {
                    const name = (id: string) =>
                      rosterPlayers.find((p) => p.id === id)?.displayName ?? id;
                    return (
                      <li key={`${fixture.participantAId}-${fixture.participantBId}`}>
                        {name(fixture.participantAId)} vs {name(fixture.participantBId)}
                      </li>
                    );
                  })}
                </ol>
                {swissPreview.byeParticipantId ? (
                  <p className="mt-2 text-muted-foreground">
                    Bye (counts as a win):{" "}
                    {rosterPlayers.find((p) => p.id === swissPreview.byeParticipantId)
                      ?.displayName ?? swissPreview.byeParticipantId}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {ctx && bracket ? (
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Bracket</h2>
            <p className="text-sm text-muted-foreground">
              Single elimination: the winner of each match moves on; the top seeds get any
              byes. Every match needs a winner, so log a forfeit rather than cancelling.
            </p>
          </div>
          {bracket.bracket ? (
            <BracketTree bracket={bracket.bracket} seasonId={ctx?.seasonId} />
          ) : bracket.seededByCut ? (
            !bracket.cutReady ? (
              <p className="text-sm text-muted-foreground">
                When the Swiss rounds are done, the top {bracket.cutSize} players go into
                this bracket, seeded by their Swiss rank. Dropped players don&apos;t make
                the cut.
              </p>
            ) : isMain && !ended ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  The Swiss rounds are done. Cut the top {bracket.cutSize} into the
                  bracket: Swiss 1st is seed 1, and seeds 1 and 2 can only meet in the
                  final.
                </p>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={thirdPlace}
                    onChange={(e) => {
                      setThirdPlace(e.target.checked);
                      setCutPreview(null);
                    }}
                  />
                  Play a third-place match
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={buttonVariants({ variant: "outline" })}
                    disabled={busy}
                    onClick={() => void previewTopCut()}
                  >
                    Preview top cut
                  </button>
                  <button
                    type="button"
                    className={buttonVariants()}
                    disabled={busy || !cutPreview}
                    onClick={() => void makeTopCut()}
                  >
                    Make top cut
                  </button>
                </div>
                {cutPreview ? (
                  <div className="space-y-3 text-sm">
                    {cutPreview.warnings.length ? (
                      <ul className="list-disc space-y-1 pl-5 text-warning">
                        {cutPreview.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}
                    <table className="w-full max-w-lg text-left">
                      <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th scope="col" className="py-1 pr-3 font-medium">
                            Seed
                          </th>
                          <th scope="col" className="py-1 pr-3 font-medium">
                            Player
                          </th>
                          <th scope="col" className="py-1 pr-3 text-right font-medium">
                            Swiss
                          </th>
                          <th scope="col" className="py-1 pr-3 text-right font-medium">
                            Pts
                          </th>
                          <th scope="col" className="py-1 text-right font-medium">
                            OMW%
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...cutPreview.made, ...cutPreview.missed].map((row, index) => {
                          const out = index >= cutPreview.made.length;
                          return (
                            <tr
                              key={row.participantId}
                              className={`${out ? "text-muted-foreground" : "text-foreground"} ${
                                index === cutPreview.made.length
                                  ? "border-t-2 border-border"
                                  : ""
                              }`}
                            >
                              <td className="py-1 pr-3 tabular-nums">
                                {out ? "out" : index + 1}
                              </td>
                              <td className="py-1 pr-3">{row.displayName}</td>
                              <td className="py-1 pr-3 text-right tabular-nums">
                                {row.rank}
                              </td>
                              <td className="py-1 pr-3 text-right tabular-nums">
                                {row.matchPoints}
                              </td>
                              <td className="py-1 text-right tabular-nums">
                                {(row.opponentsMatchWinPct * 100).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <BracketTree bracket={cutPreview.bracket} />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                The Swiss rounds are done: the main organiser makes the top cut.
              </p>
            )
          ) : isMain && !ended ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Seed order (seed 1 first). Seeds 1 and 2 can only meet in the final.
              </p>
              <ol className="divide-y divide-border rounded-lg border border-border text-sm">
                {seedOrder.map((id, index) => (
                  <li key={id} className="flex items-center gap-3 px-3 py-1.5">
                    <span className="w-6 text-right tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-foreground">
                      {rosterPlayers.find((p) => p.id === id)?.displayName ?? id}
                    </span>
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "outline",
                        className: "px-2 py-0.5 text-xs",
                      })}
                      disabled={busy || index === 0}
                      aria-label="Move up"
                      onClick={() => moveSeed(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "outline",
                        className: "px-2 py-0.5 text-xs",
                      })}
                      disabled={busy || index === seedOrder.length - 1}
                      aria-label="Move down"
                      onClick={() => moveSeed(index, 1)}
                    >
                      ↓
                    </button>
                  </li>
                ))}
              </ol>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={thirdPlace}
                  onChange={(e) => {
                    setThirdPlace(e.target.checked);
                    setBracketPreview(null);
                  }}
                />
                Play a third-place match
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonVariants({ variant: "outline" })}
                  disabled={busy}
                  onClick={shuffleSeeds}
                >
                  Shuffle seeds
                </button>
                <button
                  type="button"
                  className={buttonVariants({ variant: "outline" })}
                  disabled={busy || seedOrder.length < 2}
                  onClick={() => void previewBracket()}
                >
                  Preview bracket
                </button>
                <button
                  type="button"
                  className={buttonVariants()}
                  disabled={busy || !bracketPreview}
                  onClick={() => void makeBracket()}
                >
                  Make bracket
                </button>
              </div>
              {bracketPreview ? <BracketTree bracket={bracketPreview} /> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              The main organiser makes the bracket.
            </p>
          )}
        </section>
      ) : null}

      {ctx && isMain && (!formatPlan || formatPlan.template === "league") ? (
        <CollapsedOnceStarted
          started={fixtures.length > 0}
          summary="Generate more fixtures"
        >
          <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Generate fixtures</h2>
              <p className="text-sm text-muted-foreground">
                Preview rounds and warnings before committing the schedule.
                {formatPlan ? (
                  <span className="mt-1 block">
                    Format plan:{" "}
                    {formatPlan.phases.find((p) => p.kind === "league")?.label ??
                      "League"}
                  </span>
                ) : null}
              </p>
            </div>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              Generation mode
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 max-w-xs"
                value={generationMode}
                onChange={(e) => {
                  const mode = e.target.value as GenerationMode;
                  setGenerationMode(mode);
                  setGenerationPreview(null);
                  if (mode === "manual" && manualRounds.length === 0) {
                    setManualRounds([emptyManualRound(1)]);
                  }
                }}
              >
                <option value="single_round_robin">Single round-robin</option>
                <option value="double_round_robin">Double round-robin</option>
                <option value="manual">Manual schedule (import existing)</option>
              </select>
            </label>
            {generationMode === "manual" ? (
              <ManualFixtureBuilder
                participants={rosterPlayers.map((player) => ({
                  id: player.id,
                  displayName: player.displayName,
                }))}
                rounds={manualRounds}
                onChange={(rounds) => {
                  setManualRounds(rounds);
                  setGenerationPreview(null);
                }}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                disabled={
                  busy ||
                  (generationMode === "manual" &&
                    manualPairingsPayload(manualRounds).length === 0)
                }
                onClick={() => void previewGeneration()}
              >
                Preview generation
              </button>
              <button
                type="button"
                className={buttonVariants()}
                disabled={busy || !generationPreview}
                onClick={() => void commitGeneration()}
              >
                Commit preview
              </button>
            </div>
            {generationPreview ? (
              <div className="space-y-3 text-sm">
                {generationPreview.blockingErrors.length ? (
                  <p
                    className="rounded-md border border-danger/35 bg-danger-soft p-3 text-danger"
                    role="alert"
                  >
                    {generationPreview.blockingErrors
                      .map((item) => item.message)
                      .join(" ")}
                  </p>
                ) : null}
                {generationPreview.warnings.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-warning">
                    {generationPreview.warnings.map((item) => (
                      <li key={item.code}>{item.message}</li>
                    ))}
                  </ul>
                ) : null}
                <ul className="space-y-2">
                  {generationPreview.rounds.map((round) => (
                    <li key={round.sequence} className="rounded-md bg-muted p-3">
                      <p className="font-semibold text-foreground">{round.label}</p>
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        {round.fixtures.map((fixture, index) => {
                          const nameA =
                            rosterPlayers.find((p) => p.id === fixture.participantAId)
                              ?.displayName ?? fixture.participantAId;
                          const nameB =
                            rosterPlayers.find((p) => p.id === fixture.participantBId)
                              ?.displayName ?? fixture.participantBId;
                          return (
                            <li key={index}>
                              {fixture.isBye ? `${nameA} — bye` : `${nameA} vs ${nameB}`}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </CollapsedOnceStarted>
      ) : null}

      {ctx &&
      access?.platformAdmin &&
      (!formatPlan || formatPlan.template === "league") ? (
        <ImportPanel
          seasonId={ctx.seasonId}
          timezone={ctx.timezone}
          onImported={async (text) => {
            setMessage(text);
            await refresh();
          }}
        />
      ) : null}

      {ctx ? <RoundsList board={board} /> : null}
    </>
  );
}

/** Once an event has matches, generating more is rare: keep it folded away. */
function CollapsedOnceStarted({
  started,
  summary,
  children,
}: {
  started: boolean;
  summary: string;
  children: React.ReactNode;
}) {
  if (!started) return <>{children}</>;
  return (
    <details className="rounded-lg border bg-muted/50">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
        {summary}
      </summary>
      <div className="p-2">{children}</div>
    </details>
  );
}
