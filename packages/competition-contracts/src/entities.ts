import { z } from "zod";
import {
  AuditEventId,
  PlatformId,
  CompetitionId,
  CustomerAccountId,
  DeckRevisionId,
  DeckSubmissionId,
  FixtureId,
  GameId,
  GroupStaffId,
  PlayerLinkRequestId,
  EventJoinRequestId,
  MatchId,
  MembershipId,
  ParticipantId,
  PrintingId,
  ResultSubmissionId,
  RoundId,
  RulesetId,
  ScheduleProposalId,
  SeasonId,
  SeasonInvitationId,
  StreamLinkId,
} from "./ids.js";
import {
  CompetitionStatus,
  CompetitionVisibility,
  DeckSubmissionState,
  FixtureSlotSide,
  FixtureState,
  GameOutcome,
  GroupStaffRole,
  MatchOutcome,
  MembershipRole,
  MembershipStatus,
  ResultSubmissionState,
  RoundPublicationState,
  BracketStyle,
  CompetitionFormatTemplate,
  EventGame,
  FormatPhaseStatus,
  PhaseKind,
  ScheduleGenerationMode,
  ScheduleProposalStatus,
  SeasonStatus,
  StreamLinkVisibility,
} from "./enums.js";

export const Competition = z.object({
  id: CompetitionId,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  visibility: CompetitionVisibility,
  status: CompetitionStatus,
  ownerCustomerAccountId: CustomerAccountId,
  timezone: z.string().min(1).max(64),
  /** Readable link (`/<slug>/…`), made once from the name. */
  slug: z.string().max(80).optional(),
  /** Branding: https image links (optional). */
  logoUrl: z.string().url().max(2000).nullable().optional(),
  coverUrl: z.string().url().max(2000).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Competition = z.infer<typeof Competition>;

export const FormatPhaseConfig = z.object({
  sequence: z.number().int().positive(),
  kind: PhaseKind,
  label: z.string().min(1).max(100),
  leagueMode: ScheduleGenerationMode.optional(),
  swissRounds: z.number().int().min(1).max(15).optional(),
  cutSize: z.number().int().min(2).max(512).optional(),
  bracketSize: z.number().int().min(2).max(512).optional(),
  bracketStyle: BracketStyle.optional(),
  status: FormatPhaseStatus,
});
export type FormatPhaseConfig = z.infer<typeof FormatPhaseConfig>;

export const SeasonFormatPlan = z.object({
  id: z.string().min(1),
  seasonId: SeasonId,
  template: CompetitionFormatTemplate,
  phases: z.array(FormatPhaseConfig).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SeasonFormatPlan = z.infer<typeof SeasonFormatPlan>;

/**
 * One-day events: a suggested start per round, every `roundMinutes` from
 * `startAt`, with breaks after given rounds (owner, 2026-10-19). Suggestions
 * only: players still propose and agree times.
 */
export const RoundSchedule = z.object({
  startAt: z.string().datetime(),
  roundMinutes: z.number().int().min(10).max(480),
  breaks: z
    .array(
      z.object({
        afterRound: z.number().int().min(1).max(64),
        minutes: z.number().int().min(5).max(480),
      }),
    )
    .max(16),
});
export type RoundSchedule = z.infer<typeof RoundSchedule>;

const PinnedRelease = z.object({
  releaseId: z.string().min(1).max(64),
  effectiveFrom: z.string().datetime(),
  sourceUrl: z.string().max(2000),
});

/**
 * An event's official list: the release it uses, and the one an organiser
 * accepted from its effective date (it takes over once that date passes).
 */
export const SeasonCardList = PinnedRelease.extend({
  next: PinnedRelease.extend({
    acceptedBy: CustomerAccountId,
    acceptedAt: z.string().datetime(),
  }).nullable(),
});
export type SeasonCardList = z.infer<typeof SeasonCardList>;

export const Season = z.object({
  id: SeasonId,
  competitionId: CompetitionId,
  name: z.string().min(1).max(200),
  status: SeasonStatus,
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  roundSchedule: RoundSchedule.nullable().optional(),
  /** Readable link within its group (`/<group>/<slug>`), made once from the name. */
  slug: z.string().max(80).optional(),
  /** Overrides the group's branding for this event. */
  logoUrl: z.string().url().max(2000).nullable().optional(),
  coverUrl: z.string().url().max(2000).nullable().optional(),
  /** Set once (wizard, or once for older events) and never changed. */
  game: EventGame.nullable().optional(),
  /**
   * "private" hides the event from everyone but its own players, the group's
   * organisers and the platform admin. Unset means public.
   */
  visibility: CompetitionVisibility.optional(),
  /**
   * Organisers open registration (join requests) for an upcoming public event;
   * it closes by itself once the event starts.
   */
  registrationOpen: z.boolean().optional(),
  /** The official list release this event follows (organisers move it on). */
  cardList: SeasonCardList.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Season = z.infer<typeof Season>;

export const Ruleset = z.object({
  id: RulesetId,
  seasonId: SeasonId,
  matchesPerFixture: z.union([z.literal(1), z.literal(2)]),
  gamesToWinMatch: z.literal(2),
  matchPointsWin: z.literal(3),
  matchPointsDraw: z.literal(1),
  matchPointsLoss: z.literal(0),
  scheduleGenerationMode: ScheduleGenerationMode,
  tiebreakerOrder: z.array(z.string().min(1)).min(1),
  rulesReleaseId: z.string().nullable(),
  schedulingWindowStart: z.string().datetime().nullable(),
  schedulingWindowEnd: z.string().datetime().nullable(),
  deckDeadline: z.string().datetime().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
});
export type Ruleset = z.infer<typeof Ruleset>;

/** Master Duel player ID (the friend code), stored as its 9 digits. */
export const MasterDuelId = z.string().regex(/^\d{9}$/, "A Master Duel ID is 9 digits.");

/** As typed: "123-456-789" or "123 456 789" become 9 digits. */
export const MasterDuelIdInput = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(MasterDuelId);

export const Participant = z.object({
  id: ParticipantId,
  competitionId: CompetitionId,
  displayName: z.string().min(1).max(100),
  /** In-game name (Master Duel username); public under the player's consent. */
  onlineClientUsername: z.string().max(64).nullable(),
  /** Master Duel ID: only the player's opponents and organisers see it, never public pages. */
  masterDuelId: MasterDuelId.nullable().optional(),
  /** Earlier names (renamed from the player's profile), still matched by imports. */
  aliases: z.array(z.string().max(100)).max(20).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Participant = z.infer<typeof Participant>;

/** KONAMI ID (Card Game Network): 10 digits. */
export const KonamiId = z.string().regex(/^\d{10}$/, "A KONAMI ID is 10 digits.");

/**
 * A player's own details, per account: the name, Master Duel username and
 * Master Duel ID copied to every player record of theirs, and their KONAMI ID
 * (private: the player and their groups' organisers).
 */
export const PlayerDetails = z.object({
  customerAccountId: CustomerAccountId,
  displayName: z.string().min(1).max(100),
  onlineClientUsername: z.string().max(64).nullable(),
  masterDuelId: MasterDuelId.nullable().optional(),
  konamiId: KonamiId.nullable(),
  updatedAt: z.string().datetime(),
});
export type PlayerDetails = z.infer<typeof PlayerDetails>;

export const Membership = z.object({
  id: MembershipId,
  seasonId: SeasonId,
  participantId: ParticipantId,
  customerAccountId: CustomerAccountId.nullable(),
  role: MembershipRole,
  status: MembershipStatus,
  eligible: z.boolean(),
  /** Swiss: dropped from the event; stays in the standings, isn't paired again. */
  droppedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Membership = z.infer<typeof Membership>;

export const Round = z.object({
  id: RoundId,
  seasonId: SeasonId,
  sequence: z.number().int().positive(),
  label: z.string().min(1).max(100),
  schedulingWindowStart: z.string().datetime().nullable(),
  schedulingWindowEnd: z.string().datetime().nullable(),
  publicationState: RoundPublicationState,
  /** Format-plan phase this round belongs to (Swiss rounds; absent for league). */
  phaseSequence: z.number().int().positive().optional(),
  /** Swiss: the player with a bye this round (counts as a match win). */
  byeParticipantId: ParticipantId.nullable().optional(),
  /** Swiss: seed the pairing was shuffled with, so it can be reproduced. */
  pairingSeed: z.string().optional(),
  /** Bracket: the round's stage (`r<round>` or `third`). */
  bracketStage: z.string().optional(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
});
export type Round = z.infer<typeof Round>;

export const FixtureSlot = z.object({
  side: FixtureSlotSide,
  participantId: ParticipantId,
});
export type FixtureSlot = z.infer<typeof FixtureSlot>;

export const Fixture = z.object({
  id: FixtureId,
  roundId: RoundId,
  seasonId: SeasonId,
  state: FixtureState,
  slots: z.tuple([FixtureSlot, FixtureSlot]),
  confirmedStartAt: z.string().datetime().nullable(),
  matchesPerFixture: z.union([z.literal(1), z.literal(2)]),
  /** Bracket: the match this fixture plays (`r<round>-<index>` or `third`). */
  bracketMatch: z.string().optional(),
  /** Imported: how a re-run of the import recognises this match (`<source>:<id>`). */
  importRef: z.string().max(300).optional(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Fixture = z.infer<typeof Fixture>;

/** A single-elimination bracket for a season's bracket phase (formats plan step 2). */
export const Bracket = z.object({
  id: z.string().min(1),
  seasonId: SeasonId,
  phaseSequence: z.number().int().positive(),
  /** Participant ids in seed order (index 0 = seed 1). */
  seeds: z.array(ParticipantId).min(2),
  thirdPlace: z.boolean(),
  createdAt: z.string().datetime(),
});
export type Bracket = z.infer<typeof Bracket>;

export const ScheduleProposal = z.object({
  id: ScheduleProposalId,
  fixtureId: FixtureId,
  proposerMembershipId: MembershipId,
  proposedStartAt: z.string().datetime(),
  note: z.string().max(500).nullable(),
  status: ScheduleProposalStatus,
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
});
export type ScheduleProposal = z.infer<typeof ScheduleProposal>;

export const Game = z.object({
  id: GameId,
  matchId: MatchId,
  sequence: z.number().int().positive(),
  outcome: GameOutcome,
});
export type Game = z.infer<typeof Game>;

export const Match = z.object({
  id: MatchId,
  fixtureId: FixtureId,
  sequence: z.number().int().positive(),
  outcome: MatchOutcome.nullable(),
  pointsPlayerA: z.number().int().min(0).max(6),
  pointsPlayerB: z.number().int().min(0).max(6),
  finalizationVersion: z.number().int().positive(),
  games: z.array(Game),
});
export type Match = z.infer<typeof Match>;

export const ResultSubmission = z.object({
  id: ResultSubmissionId,
  matchId: MatchId,
  submitterMembershipId: MembershipId,
  state: ResultSubmissionState,
  payload: z.record(z.string(), z.unknown()),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ResultSubmission = z.infer<typeof ResultSubmission>;

export const Standing = z.object({
  participantId: ParticipantId,
  seasonId: SeasonId,
  rank: z.number().int().positive(),
  matchesPlayed: z.number().int().min(0),
  matchesWon: z.number().int().min(0),
  matchesDrawn: z.number().int().min(0),
  matchesLost: z.number().int().min(0),
  gamesPlayed: z.number().int().min(0),
  gamesWon: z.number().int().min(0),
  gamesDrawn: z.number().int().min(0),
  gamesLost: z.number().int().min(0),
  matchPoints: z.number().int().min(0),
  tiebreakerValues: z.record(z.string(), z.number()),
  rebuiltAt: z.string().datetime(),
});
export type Standing = z.infer<typeof Standing>;

export const DeckSubmission = z.object({
  id: DeckSubmissionId,
  matchId: MatchId,
  participantId: ParticipantId,
  deckRevisionId: DeckRevisionId.nullable(),
  state: DeckSubmissionState,
  lockedAt: z.string().datetime().nullable(),
  revealedAt: z.string().datetime().nullable(),
  legalitySnapshotRef: z.string().nullable(),
});
export type DeckSubmission = z.infer<typeof DeckSubmission>;

export const StreamLink = z.object({
  id: StreamLinkId,
  fixtureId: FixtureId,
  url: z.string().url(),
  label: z.string().max(100).nullable(),
  visibility: StreamLinkVisibility,
  approvedByCustomerAccountId: CustomerAccountId,
  createdAt: z.string().datetime(),
});
export type StreamLink = z.infer<typeof StreamLink>;

export const AuditEvent = z.object({
  id: AuditEventId,
  actorCustomerAccountId: CustomerAccountId.nullable(),
  action: z.string().min(1).max(128),
  targetType: z.string().min(1).max(64),
  targetId: z.string().min(1).max(128),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  occurredAt: z.string().datetime(),
});
export type AuditEvent = z.infer<typeof AuditEvent>;

export const SeasonInvitation = z.object({
  id: SeasonInvitationId,
  seasonId: SeasonId,
  email: z.string().email().max(254),
  displayName: z.string().min(1).max(100),
  role: MembershipRole,
  onlineClientUsername: z.string().max(64).nullable(),
  token: z.string().min(1).max(128),
  /** Invite-only sign-up: the Authentik sign-up invitation for this email (`itoken`). */
  signupToken: z.string().uuid().nullable().optional(),
  invitedByCustomerAccountId: CustomerAccountId,
  acceptedAt: z.string().datetime().nullable(),
  /** Who accepted (on the invite page, or automatically on signing in with this email). */
  acceptedByCustomerAccountId: CustomerAccountId.nullable().optional(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type SeasonInvitation = z.infer<typeof SeasonInvitation>;

/**
 * An email allowed to create an Enigmic account while sign-up is closed
 * (invite-only sign-up), without an event: added by the platform admin
 * (`competitionId` null) or an event group's main organiser. Authentik holds
 * the sign-up invitation (`signupToken`) and emails it.
 */
export const AllowedEmail = z.object({
  id: PlatformId,
  email: z.string().email().max(254),
  displayName: z.string().min(1).max(100),
  competitionId: CompetitionId.nullable(),
  signupToken: z.string().uuid().nullable(),
  addedByCustomerAccountId: CustomerAccountId,
  createdAt: z.string().datetime(),
});
export type AllowedEmail = z.infer<typeof AllowedEmail>;

/** Organiser of an event group (competition), D-058. */
/**
 * A main organiser asks to link a roster player (e.g. one imported from
 * md-league) to the account with this email; the account's owner accepts or
 * declines it. One pending request per player.
 */
export const PlayerLinkRequest = z.object({
  id: PlayerLinkRequestId,
  competitionId: CompetitionId,
  participantId: ParticipantId,
  email: z.string().email().max(254),
  status: z.enum(["pending", "accepted", "declined", "cancelled"]),
  requestedByCustomerAccountId: CustomerAccountId,
  /** Invite-only sign-up: the Authentik sign-up invitation, when the email had no account. */
  signupToken: z.string().uuid().nullable().optional(),
  decidedByCustomerAccountId: CustomerAccountId.nullable(),
  decidedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type PlayerLinkRequest = z.infer<typeof PlayerLinkRequest>;

/**
 * A signed-in player asks to join an upcoming public event while its
 * registration is open; an organiser accepts (they're on the roster, linked to
 * their account) or declines. One pending request per account and event.
 */
export const EventJoinRequest = z.object({
  id: EventJoinRequestId,
  seasonId: SeasonId,
  customerAccountId: CustomerAccountId,
  displayName: z.string().min(1).max(100),
  onlineClientUsername: z.string().max(64).nullable(),
  note: z.string().max(500).nullable(),
  status: z.enum(["pending", "accepted", "declined", "cancelled"]),
  decidedByCustomerAccountId: CustomerAccountId.nullable(),
  decidedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type EventJoinRequest = z.infer<typeof EventJoinRequest>;

export const GroupStaff = z.object({
  id: GroupStaffId,
  competitionId: CompetitionId,
  customerAccountId: CustomerAccountId,
  role: GroupStaffRole,
  addedByCustomerAccountId: CustomerAccountId,
  createdAt: z.string().datetime(),
});
export type GroupStaff = z.infer<typeof GroupStaff>;

/**
 * An account seen by competition-api (refreshed on every signed-in request),
 * so organisers can be added by email. Identity stays with the identity
 * provider; this is a cache.
 */
/** A personal calendar subscription: the secret in the feed's URL (calendar apps can't sign in). */
export const CalendarFeed = z.object({
  customerAccountId: CustomerAccountId,
  token: z.string().min(32).max(128),
  createdAt: z.string().datetime(),
});
export type CalendarFeed = z.infer<typeof CalendarFeed>;

/**
 * An organiser's change to the official list for one event: a card's copies
 * (Ban List: 0 forbidden … 3 unlimited) or its Genesys points.
 */
export const EventCardChange = z.object({
  id: z.string().min(1),
  seasonId: SeasonId,
  /** card-api card id; null for a card typed by name that the API didn't find. */
  cardId: z.string().max(64).nullable(),
  cardName: z.string().min(1).max(200),
  maxCopies: z.number().int().min(0).max(3).nullable(),
  points: z.number().int().min(0).max(100).nullable(),
  updatedBy: CustomerAccountId,
  updatedAt: z.string().datetime(),
});
export type EventCardChange = z.infer<typeof EventCardChange>;

/** An organiser's answer to a newer official list for one event. */
export const CardListDecision = z.object({
  id: z.string().min(1),
  seasonId: SeasonId,
  releaseId: z.string().min(1).max(64),
  decision: z.enum(["accepted", "rejected"]),
  /** Accepted to apply now, or from the list's effective date. */
  from: z.enum(["now", "effective_date"]).nullable(),
  decidedBy: CustomerAccountId,
  decidedAt: z.string().datetime(),
});
export type CardListDecision = z.infer<typeof CardListDecision>;

export const KnownAccount = z.object({
  customerAccountId: CustomerAccountId,
  email: z.string().max(254).nullable(),
  emailVerified: z.boolean(),
  displayName: z.string().max(100),
  lastSeenAt: z.string().datetime(),
  /** Authentik's own user number (`ak_pk` claim): its "user deleted" event names only this. */
  authentikPk: z.number().int().positive().optional(),
});
export type KnownAccount = z.infer<typeof KnownAccount>;

export const Weekday = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export type Weekday = z.infer<typeof Weekday>;

/** A recurring weekly time range, wall-clock in the owner's timezone ("24:00" ends the day). */
export const WeeklySlot = z.object({
  day: Weekday,
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/),
});
export type WeeklySlot = z.infer<typeof WeeklySlot>;

/**
 * When a player is usually free (R2). Seen by players who share an event with
 * them and by their organisers; never public.
 */
export const PlayerAvailability = z.object({
  customerAccountId: CustomerAccountId,
  timezone: z.string().min(1).max(64),
  slots: z.array(WeeklySlot).max(28),
  note: z.string().max(500).nullable(),
  updatedAt: z.string().datetime(),
});
export type PlayerAvailability = z.infer<typeof PlayerAvailability>;

export const CustomerConsent = z.object({
  customerAccountId: CustomerAccountId,
  publicDisplayName: z.boolean(),
  onlineClientUsername: z.boolean(),
  decklists: z.boolean(),
  updatedAt: z.string().datetime(),
});
export type CustomerConsent = z.infer<typeof CustomerConsent>;

/** Dev/local invitation email outbox entry (no SMTP in C2). */
export const InvitationEmailLog = z.object({
  id: z.string().min(1),
  invitationId: SeasonInvitationId,
  seasonId: SeasonId,
  to: z.string().email().max(254),
  subject: z.string().max(200),
  body: z.string().max(2000),
  acceptUrl: z.string().url().max(500),
  createdAt: z.string().datetime(),
});
export type InvitationEmailLog = z.infer<typeof InvitationEmailLog>;

/** Card reference stored by competition — canonical text hydrated at read time. */
export const StoredPrintingReference = z.object({
  printingId: PrintingId,
  quantity: z.number().int().positive().optional(),
});
export type StoredPrintingReference = z.infer<typeof StoredPrintingReference>;
