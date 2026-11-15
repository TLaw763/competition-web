import type { FixtureState } from "@enigmic/competition-contracts";

export type FixtureStateMeta = {
  label: string;
  icon: string;
  className: string;
};

/** Competition fixture state presentation — styling-guide § Card and competition domain tokens. */
export const FIXTURE_STATE_META: Record<FixtureState, FixtureStateMeta> = {
  generated: {
    label: "Generated",
    icon: "📅",
    className: "fixture-state--generated",
  },
  time_proposed: {
    label: "Time proposed",
    icon: "🕐",
    className: "fixture-state--time_proposed",
  },
  confirmed: {
    label: "Confirmed",
    icon: "✓",
    className: "fixture-state--confirmed",
  },
  in_progress: {
    label: "In progress",
    icon: "▶",
    className: "fixture-state--in_progress",
  },
  result_pending: {
    label: "Result pending",
    icon: "⏳",
    className: "fixture-state--result_pending",
  },
  disputed: {
    label: "Disputed",
    icon: "⚠",
    className: "fixture-state--disputed",
  },
  finalized: {
    label: "Finalized",
    icon: "✓",
    className: "fixture-state--finalized",
  },
  postponed: {
    label: "Postponed",
    icon: "📆",
    className: "fixture-state--postponed",
  },
  cancelled: {
    label: "Cancelled",
    icon: "✕",
    className: "fixture-state--cancelled",
  },
};

export function getFixtureStateMeta(state: string): FixtureStateMeta {
  return (
    FIXTURE_STATE_META[state as FixtureState] ?? {
      label: state.replaceAll("_", " "),
      icon: "●",
      className: "fixture-state--generated",
    }
  );
}

export function canConfirmSchedule(state: string): boolean {
  return state === "generated" || state === "time_proposed" || state === "postponed";
}

export function isFixtureClosed(state: string): boolean {
  return state === "cancelled" || state === "finalized";
}
