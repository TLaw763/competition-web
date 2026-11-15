"use client";

import { buttonVariants } from "./ui/button";

import { useState } from "react";
import { bffFetch, errorMessage } from "../lib/bff-client";
import { GAMES, gameInfo, type EventGame } from "../lib/games";
import { useConfirm } from "./confirm-dialog";
import { useToast } from "./toast";

/**
 * The event's game. New events choose it in the wizard; an older event
 * without one gets it here once, from its main organiser. Then it's fixed.
 */
export function GamePanel({
  seasonId,
  seasonName,
  game,
  canSet,
  onSet,
}: {
  seasonId: string;
  seasonName: string;
  game: string | null | undefined;
  canSet: boolean;
  onSet: () => Promise<void> | void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [choice, setChoice] = useState<EventGame | "">("");
  const [busy, setBusy] = useState(false);
  const info = gameInfo(game);

  async function save() {
    const picked = gameInfo(choice);
    if (!picked) return;
    const ok = await confirm({
      title: `Set ${seasonName} to ${picked.label}?`,
      body: "The game can't be changed afterwards.",
      confirmLabel: `Set to ${picked.label}`,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await bffFetch(`/v1/seasons/${seasonId}/game`, {
        method: "PUT",
        body: JSON.stringify({ game: picked.id }),
      });
      toast.success(`${seasonName}: game set to ${picked.label}.`);
      await onSet();
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't set the game."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Game</h2>
        <p className="text-sm text-muted-foreground">
          {info
            ? "Chosen when the event was created; it can't be changed."
            : "This event was created before games were chosen in the wizard. Set it once; it can't be changed afterwards."}
        </p>
      </div>
      {info ? (
        <div className="flex items-center gap-3 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={info.logo}
            alt=""
            className="h-10 w-20 rounded-md border border-border bg-white object-contain p-1"
          />
          <span className="font-medium text-foreground">{info.label}</span>
        </div>
      ) : canSet ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Game
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={choice}
              onChange={(e) => setChoice(e.target.value as EventGame | "")}
            >
              <option value="">Choose…</option>
              {GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={buttonVariants()}
            disabled={!choice || busy}
            onClick={() => void save()}
          >
            Set game
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not set yet. The main organiser sets it.
        </p>
      )}
    </section>
  );
}
