"use client";

import { buttonVariants } from "./ui/button";

import { useState } from "react";
import { bffFetch, errorMessage } from "../lib/bff-client";
import { useConfirm } from "./confirm-dialog";
import { useToast } from "./toast";

type Visibility = "public" | "private";

/**
 * Who sees the event: everyone who can see its group, or only its own
 * players and the group's organisers (e.g. test events). Main organiser or
 * platform admin.
 */
export function VisibilityPanel({
  seasonId,
  seasonName,
  visibility,
  canSet,
  onSet,
}: {
  seasonId: string;
  seasonName: string;
  visibility: Visibility;
  canSet: boolean;
  onSet: () => Promise<void> | void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const hidden = visibility === "private";

  async function change(next: Visibility) {
    const ok = await confirm(
      next === "private"
        ? {
            title: `Hide ${seasonName}?`,
            body: "It leaves the home page, the public calendar and player pages. Only its players and this group's organisers can open it; its link shows “Event not found” to everyone else.",
            confirmLabel: "Hide event",
          }
        : {
            title: `Show ${seasonName} to everyone?`,
            body: "Everyone who can see this group sees it again: home page, calendar, standings and results.",
            confirmLabel: "Show event",
          },
    );
    if (!ok) return;
    setBusy(true);
    try {
      await bffFetch(`/v1/seasons/${seasonId}/visibility`, {
        method: "PUT",
        body: JSON.stringify({ visibility: next }),
      });
      toast.success(
        next === "private"
          ? `${seasonName} is hidden.`
          : `${seasonName} is visible again.`,
      );
      await onSet();
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't change who sees the event."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Visibility</h2>
        <p className="text-sm text-muted-foreground">
          {hidden
            ? "Hidden: only this event's players and the group's organisers can see it."
            : "Visible to everyone who can see this group."}
        </p>
      </div>
      {canSet ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Who sees this event"
        >
          {(
            [
              ["public", "Everyone"],
              ["private", "Only its players and organisers"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={visibility === id}
              className={buttonVariants({
                variant: visibility === id ? "default" : "outline",
              })}
              disabled={busy || visibility === id}
              onClick={() => void change(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">The main organiser changes this.</p>
      )}
    </section>
  );
}
