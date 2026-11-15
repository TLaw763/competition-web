import { z } from "zod";

export const CompetitionVisibility = z.enum(["private", "public"]);
export type CompetitionVisibility = z.infer<typeof CompetitionVisibility>;

export const CompetitionStatus = z.enum(["draft", "active", "completed", "archived"]);
export type CompetitionStatus = z.infer<typeof CompetitionStatus>;

export const SeasonStatus = z.enum(["draft", "active", "completed", "archived"]);
export type SeasonStatus = z.infer<typeof SeasonStatus>;

export const ScheduleGenerationMode = z.enum([
  "single_round_robin",
  "double_round_robin",
  "manual",
]);
export type ScheduleGenerationMode = z.infer<typeof ScheduleGenerationMode>;

/** High-level competition structure selected in the create wizard. */
export const CompetitionFormatTemplate = z.enum([
  "league",
  "swiss",
  "bracket",
  "hybrid_swiss_cut",
]);
export type CompetitionFormatTemplate = z.infer<typeof CompetitionFormatTemplate>;

/** Phase block within a season (league, Swiss, or bracket). */
export const PhaseKind = z.enum(["league", "swiss", "bracket"]);
export type PhaseKind = z.infer<typeof PhaseKind>;

export const BracketStyle = z.enum(["single_elimination", "double_elimination"]);

/** The game an event is played in; chosen in the wizard and then fixed. */
export const EventGame = z.enum(["master_duel", "advanced", "genesys"]);
export type EventGame = z.infer<typeof EventGame>;
export type BracketStyle = z.infer<typeof BracketStyle>;

export const FormatPhaseStatus = z.enum(["planned", "active", "completed"]);
export type FormatPhaseStatus = z.infer<typeof FormatPhaseStatus>;

export const MembershipRole = z.enum(["organizer", "participant"]);
export type MembershipRole = z.infer<typeof MembershipRole>;

/** Staff of an event group (competition), D-058. One `main_organiser` per group. */
export const GroupStaffRole = z.enum(["main_organiser", "organiser"]);
export type GroupStaffRole = z.infer<typeof GroupStaffRole>;

export const MembershipStatus = z.enum(["invited", "active", "suspended", "withdrawn"]);
export type MembershipStatus = z.infer<typeof MembershipStatus>;

export const RoundPublicationState = z.enum(["draft", "published", "locked"]);
export type RoundPublicationState = z.infer<typeof RoundPublicationState>;

/**
 * Fixture lifecycle states (D-046 visibility rules apply per state).
 * @see competition-core state-machines for allowed transitions
 */
export const FixtureState = z.enum([
  "generated",
  "time_proposed",
  "confirmed",
  "in_progress",
  "result_pending",
  "disputed",
  "finalized",
  "postponed",
  "cancelled",
]);
export type FixtureState = z.infer<typeof FixtureState>;

export const FixtureSlotSide = z.enum(["A", "B"]);
export type FixtureSlotSide = z.infer<typeof FixtureSlotSide>;

export const ScheduleProposalStatus = z.enum([
  "pending",
  /** The opponent agreed; waiting for an event organiser to confirm (D-058). */
  "accepted",
  "acknowledged",
  "superseded",
  "withdrawn",
]);
export type ScheduleProposalStatus = z.infer<typeof ScheduleProposalStatus>;

export const GameOutcome = z.enum([
  "playerAWin",
  "playerBWin",
  "draw",
  "forfeit",
  "void",
  "unplayed",
  /** Both players lose the match (an organiser's ruling): no games, no points. */
  "doubleLoss",
]);
export type GameOutcome = z.infer<typeof GameOutcome>;

export const MatchOutcome = z.enum([
  "playerAWin",
  "playerBWin",
  "draw",
  "forfeitA",
  "forfeitB",
  "void",
  "doubleLoss",
]);
export type MatchOutcome = z.infer<typeof MatchOutcome>;

export const ResultSubmissionState = z.enum([
  "submitted",
  "confirmed",
  "disputed",
  "finalized",
  "corrected",
  /** Withdrawn by the player who logged it, before it was finalised. */
  "withdrawn",
]);
export type ResultSubmissionState = z.infer<typeof ResultSubmissionState>;

export const StreamLinkVisibility = z.enum(["organizer_only", "public"]);
export type StreamLinkVisibility = z.infer<typeof StreamLinkVisibility>;

export const DeckSubmissionState = z.enum(["draft", "locked", "revealed"]);
export type DeckSubmissionState = z.infer<typeof DeckSubmissionState>;

/** Application roles checked in competition-api (not inferred from UI). */
export const ApplicationRole = z.enum([
  "platformAdmin",
  "organizer",
  "participant",
  "publicViewer",
]);
export type ApplicationRole = z.infer<typeof ApplicationRole>;

/** League scoring defaults (D-045). */
export const DEFAULT_MATCH_POINTS = {
  win: 3,
  draw: 1,
  loss: 0,
} as const;

export const DEFAULT_GAMES_TO_WIN_MATCH = 2;
export const DEFAULT_MATCHES_PER_FIXTURE = z.union([z.literal(1), z.literal(2)]);
