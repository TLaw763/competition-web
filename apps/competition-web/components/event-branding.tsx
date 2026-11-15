"use client";

import { useState } from "react";
import { gameInfo } from "../lib/games";
import type { EventPhase } from "../lib/types";

export const PHASE_LABEL: Record<EventPhase, string> = {
  ongoing: "Ongoing",
  upcoming: "Upcoming",
  past: "Ended",
};

export function PhaseBadge({ phase }: { phase: EventPhase }) {
  const tone =
    phase === "ongoing"
      ? "bg-success-soft text-success"
      : phase === "upcoming"
        ? "bg-info-soft text-info"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {PHASE_LABEL[phase]}
    </span>
  );
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return (
    words.length > 1 ? words[0]![0]! + words[1]![0]! : name.slice(0, 2)
  ).toUpperCase();
}

/** The game's name as a small label, e.g. on event cards. */
export function GameBadge({ game }: { game: string | null | undefined }) {
  const info = gameInfo(game);
  if (!info) return null;
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {info.label}
    </span>
  );
}

/**
 * The event's or group's logo; without one, the game's logo; without a game,
 * the initials (also when an image won't load).
 */
export function EventLogo({
  name,
  url,
  game,
  size = "md",
}: {
  name: string;
  url: string | null;
  game?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [broken, setBroken] = useState(false);
  const box =
    size === "lg"
      ? "h-16 w-16 text-xl"
      : size === "sm"
        ? "h-9 w-9 text-xs"
        : "h-12 w-12 text-base";
  const info = gameInfo(game);
  if ((!url || broken) && info) {
    // Wide wordmarks: shown whole on a white tile, which suits both themes.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={info.logo}
        alt={`${info.label} logo`}
        className={`${box} shrink-0 rounded-lg border border-border bg-white object-contain p-1`}
      />
    );
  }
  if (url && !broken) {
    return (
      // Organisers' own image links: not optimised by Next.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${name} logo`}
        className={`${box} shrink-0 rounded-lg border border-border bg-card object-cover`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center rounded-lg bg-accent font-semibold text-foreground`}
    >
      {initials(name)}
    </span>
  );
}

/** A cover image, or a plain band in the accent colour. */
export function EventCover({
  url,
  className = "h-28",
}: {
  url: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={`${className} w-full object-cover`}
        onError={() => setBroken(true)}
      />
    );
  }
  return <div aria-hidden="true" className={`${className} w-full bg-accent`} />;
}
