"use client";

import { buttonVariants } from "./ui/button";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { bffFetch, errorMessage } from "../lib/bff-client";
import { gameInfo } from "../lib/games";
import { eventHref, type LastEvent } from "../lib/last-event";
import type { EventCardList } from "../lib/types";
import { CardListUpdatePanel } from "./card-list-updates";
import { COPIES_LABEL, formatDay } from "./event-card-list";
import { useToast } from "./toast";

type Suggestion = { cardId: string; name: string };

/**
 * Organisers' changes to the event's official list: pick a card (search, or
 * type its name) and set its copies or points for this event only.
 */
export function CardListPanel({
  seasonId,
  game,
}: {
  seasonId: string;
  game: string | null | undefined;
}) {
  const toast = useToast();
  const info = gameInfo(game);
  const [list, setList] = useState<EventCardList | null>(null);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchDown, setSearchDown] = useState(false);
  const [copies, setCopies] = useState(0);
  const [points, setPoints] = useState("");
  const [busy, setBusy] = useState(false);
  const [listHref, setListHref] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await bffFetch<EventCardList>(`/v1/public/seasons/${seasonId}/card-list`));
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't load the list."));
    }
  }, [seasonId, toast]);

  useEffect(() => {
    if (!info) return;
    void load();
    bffFetch<LastEvent>(
      `/v1/public/events/lookup?seasonId=${encodeURIComponent(seasonId)}`,
    )
      .then((target) => setListHref(eventHref(target, "list")))
      .catch(() => setListHref(null));
  }, [info, load, seasonId]);

  // Suggestions as they type (not once a suggestion is picked).
  useEffect(() => {
    const q = name.trim();
    if (picked?.name === name || q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      bffFetch<{ items: Suggestion[]; unavailable?: boolean }>(
        `/v1/seasons/${seasonId}/card-search?q=${encodeURIComponent(q)}`,
      )
        .then((res) => {
          if (cancelled) return;
          setSuggestions(res.items);
          setSearchDown(Boolean(res.unavailable));
        })
        .catch(() => !cancelled && setSuggestions([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, picked, seasonId]);

  if (!info) return null;
  const kind = info.id === "genesys" ? "genesys" : "ban_list";
  const changes = (list?.cards ?? []).filter((c) => c.changeId);
  const pointsValue = Number(points);
  const valid =
    name.trim().length > 0 &&
    (kind === "ban_list" ||
      (points.trim() !== "" &&
        Number.isInteger(pointsValue) &&
        pointsValue >= 0 &&
        pointsValue <= 100));

  async function save() {
    setBusy(true);
    try {
      await bffFetch(`/v1/seasons/${seasonId}/card-list/changes`, {
        method: "PUT",
        body: JSON.stringify({
          cardId: picked?.name === name ? picked.cardId : null,
          cardName: name.trim(),
          ...(kind === "ban_list" ? { maxCopies: copies } : { points: pointsValue }),
        }),
      });
      toast.success(`${name.trim()} saved for this event.`);
      setName("");
      setPicked(null);
      setPoints("");
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't save the change."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(changeId: string, cardName: string) {
    setBusy(true);
    try {
      await bffFetch(`/v1/seasons/${seasonId}/card-list/changes/${changeId}`, {
        method: "DELETE",
      });
      toast.success(`${cardName} is back to the official list.`);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't remove the change."));
    } finally {
      setBusy(false);
    }
  }

  const describe = (value: number) =>
    kind === "ban_list" ? COPIES_LABEL[value] : `${value} pts`;

  return (
    <>
      <CardListUpdatePanel
        seasonId={seasonId}
        game={game}
        onChanged={() => void load()}
      />
      <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {info.listTab} changes
          </h2>
          <p className="text-sm text-muted-foreground">
            {`This event follows the official ${info.label} list${
              list?.official ? ` of ${formatDay(list.official.effectiveFrom)}` : ""
            }; cards you add here change it for this event only. Newer official lists only apply once you accept them.`}
            {listHref ? (
              <>
                {" "}
                <Link href={listHref}>See the event&apos;s list</Link>
              </>
            ) : null}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="relative flex flex-col gap-1 text-sm text-foreground">
            <label htmlFor="card-change-name">Card</label>
            <input
              id="card-change-name"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={name}
              autoComplete="off"
              onChange={(e) => {
                setName(e.target.value);
                if (picked && e.target.value !== picked.name) setPicked(null);
              }}
              placeholder="Start typing a card name"
            />
            {suggestions.length ? (
              <ul
                className="absolute top-full z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg"
                aria-label="Matching cards"
              >
                {suggestions.map((s) => (
                  <li key={s.cardId}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                      onClick={() => {
                        setPicked(s);
                        setName(s.name);
                        setSuggestions([]);
                      }}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {kind === "ban_list" ? (
            <label className="flex flex-col gap-1 text-sm text-foreground">
              At this event
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
              >
                {COPIES_LABEL.map((label, value) => (
                  <option key={label} value={value}>
                    {label} ({value})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-sm text-foreground">
              Points
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 w-28"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </label>
          )}
          <button
            type="button"
            className={buttonVariants()}
            disabled={!valid || busy}
            onClick={() => void save()}
          >
            Save change
          </button>
        </div>
        {searchDown ? (
          <p className="text-xs text-muted-foreground">
            Card search isn&apos;t answering; you can still type the card&apos;s exact
            name.
          </p>
        ) : null}

        {list === null ? (
          <div className="skeleton h-10 w-full rounded-lg" />
        ) : changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No changes: the official list applies.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {changes.map((row) => (
              <li
                key={row.changeId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Official {describe(row.official)} → {describe(row.value)} here
                  </p>
                </div>
                <button
                  type="button"
                  className={buttonVariants({ variant: "outline" })}
                  disabled={busy}
                  onClick={() => void remove(row.changeId!, row.name)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
