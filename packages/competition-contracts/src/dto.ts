import { z } from "zod";
import {
  CompetitionId,
  FixtureId,
  MembershipId,
  ParticipantId,
  RoundId,
  SeasonId,
  CustomerAccountId,
} from "./ids.js";
import {
  Competition,
  Fixture,
  FormatPhaseConfig,
  Match,
  MasterDuelIdInput,
  Participant,
  Round,
  ScheduleProposal,
  Season,
  RoundSchedule,
  SeasonFormatPlan,
  Standing,
  StreamLink,
  WeeklySlot,
} from "./entities.js";
import {
  BracketStyle,
  CompetitionFormatTemplate,
  CompetitionVisibility,
  EventGame,
  FixtureState,
  ScheduleGenerationMode,
} from "./enums.js";

/** Authenticated fixture view — includes private scheduling data (D-046). */
export const PrivateFixture = Fixture.extend({
  scheduleProposals: z.array(ScheduleProposal),
  matches: z.array(Match),
  opponentDisplayName: z.string().optional(),
});
export type PrivateFixture = z.infer<typeof PrivateFixture>;

/**
 * Public fixture projection — confirmed schedules and finalized records only.
 * Excludes account IDs, emails, proposals, and unconfirmed dates.
 */
export const PublicFixture = z.object({
  id: FixtureId,
  roundId: RoundId,
  seasonId: SeasonId,
  state: FixtureState,
  confirmedStartAt: z.string().datetime(),
  participantAId: ParticipantId,
  participantBId: ParticipantId,
  participantADisplayName: z.string(),
  participantBDisplayName: z.string(),
  participantAUsername: z.string().nullable(),
  participantBUsername: z.string().nullable(),
  finalizedScore: z
    .object({
      matches: z.array(
        z.object({
          sequence: z.number().int().positive(),
          scoreSummary: z.string(),
        }),
      ),
    })
    .nullable(),
  streamLinks: z.array(StreamLink.pick({ url: true, label: true })),
  revealedDeckRevisionIds: z
    .object({
      participantA: z.string().nullable(),
      participantB: z.string().nullable(),
    })
    .nullable(),
});
export type PublicFixture = z.infer<typeof PublicFixture>;

export const PublicCalendarEntry = z.object({
  fixtureId: FixtureId,
  seasonId: SeasonId,
  competitionId: CompetitionId,
  confirmedStartAt: z.string().datetime(),
  participantAId: ParticipantId,
  participantBId: ParticipantId,
  participantADisplayName: z.string(),
  participantBDisplayName: z.string(),
  state: FixtureState,
  /** The match's public stream links (empty when none). */
  streamLinks: z.array(StreamLink.pick({ url: true, label: true })),
});
export type PublicCalendarEntry = z.infer<typeof PublicCalendarEntry>;

/** Platform admin only: an event group and its main organiser (D-058). */
export const CreateCompetitionRequest = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  visibility: z.enum(["private", "public"]),
  timezone: z.string().min(1).max(64),
  /** Must belong to an account that has signed in at least once. */
  mainOrganiserEmail: z.string().email().max(254),
});
export type CreateCompetitionRequest = z.infer<typeof CreateCompetitionRequest>;

export const CreateSeasonRequest = z.object({
  name: z.string().min(1).max(200),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});
export type CreateSeasonRequest = z.infer<typeof CreateSeasonRequest>;

/** Main organiser: a new event (season) in their event group, with its format. */
export const CreateCompetitionWizardRequest = z.object({
  seasonName: z.string().min(1).max(200),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  /** One-day events: suggested round times. */
  roundSchedule: RoundSchedule.nullable().optional(),
  template: CompetitionFormatTemplate,
  /** Master Duel, Advanced or Genesys; fixed once the event exists. */
  game: EventGame.optional(),
  leagueMode: z.enum(["single_round_robin", "double_round_robin", "manual"]).optional(),
  swissRounds: z.number().int().min(1).max(15).optional(),
  cutSize: z.number().int().min(2).max(512).optional(),
  bracketSize: z.number().int().min(2).max(512).optional(),
  bracketStyle: BracketStyle.optional(),
  /**
   * Optional roster added at creation. With an email, the player is linked to
   * their account (or invited, and linked when they sign in).
   */
  rosterPlayers: z
    .array(
      z.object({
        displayName: z.string().min(1).max(100),
        onlineClientUsername: z.string().max(64).nullable().optional(),
        email: z.string().email().max(254).nullable().optional(),
      }),
    )
    .max(256)
    .optional(),
});
export type CreateCompetitionWizardRequest = z.infer<
  typeof CreateCompetitionWizardRequest
>;

export const FormatPlanPreviewPhase = z.object({
  sequence: z.number().int().positive(),
  label: z.string(),
  kind: z.enum(["league", "swiss", "bracket"]),
  summary: z.string(),
  automationStatus: z.enum(["available", "planned"]),
});
export type FormatPlanPreviewPhase = z.infer<typeof FormatPlanPreviewPhase>;

export const FormatPlanPreview = z.object({
  template: CompetitionFormatTemplate,
  templateLabel: z.string(),
  phases: z.array(FormatPlanPreviewPhase),
  notes: z.array(z.string()),
});
export type FormatPlanPreview = z.infer<typeof FormatPlanPreview>;

export const CreateCompetitionWizardResponse = z.object({
  competition: Competition,
  season: Season,
  formatPlan: SeasonFormatPlan,
  preview: FormatPlanPreview,
});
export type CreateCompetitionWizardResponse = z.infer<
  typeof CreateCompetitionWizardResponse
>;

export const EnrollParticipantRequest = z.object({
  displayName: z.string().min(1).max(100),
  onlineClientUsername: z.string().max(64).nullable().optional(),
  masterDuelId: MasterDuelIdInput.nullable().optional(),
  /** Kept for older clients; only participants are enrolled (organisers are group staff). */
  role: z.literal("participant").default("participant"),
  /** Roster-only: name on standings/fixtures, no platform login. Platform-linked: tied to a customer account. */
  enrollmentMode: z.enum(["roster_only", "platform_linked"]).default("roster_only"),
  customerAccountId: CustomerAccountId.optional(),
});
export type EnrollParticipantRequest = z.infer<typeof EnrollParticipantRequest>;

export const SeasonParticipantRow = Participant.extend({
  membershipId: MembershipId,
  membershipStatus: z.enum(["invited", "active", "suspended", "withdrawn"]),
  platformAccess: z.enum(["roster_only", "platform"]),
  pendingPlatformInvite: z.boolean(),
  /** A link request waiting for the account's owner (organisers only). */
  linkRequest: z
    .object({ id: z.string(), email: z.string(), createdAt: z.string().datetime() })
    .nullable()
    .optional(),
});
export type SeasonParticipantRow = z.infer<typeof SeasonParticipantRow>;

export const FixtureGenerationPreviewRequest = z.object({
  seasonId: SeasonId,
  mode: ScheduleGenerationMode,
  participantIds: z.array(ParticipantId).min(2).max(2048).optional(),
  manualPairings: z
    .array(
      z.object({
        roundSequence: z.number().int().positive(),
        participantAId: ParticipantId,
        participantBId: ParticipantId,
      }),
    )
    .max(10000)
    .optional(),
});
export type FixtureGenerationPreviewRequest = z.infer<
  typeof FixtureGenerationPreviewRequest
>;

export const FixtureGenerationPreview = z.object({
  rounds: z.array(
    z.object({
      sequence: z.number().int().positive(),
      label: z.string(),
      fixtures: z.array(
        z.object({
          participantAId: ParticipantId,
          participantBId: ParticipantId,
          isBye: z.boolean(),
        }),
      ),
    }),
  ),
  warnings: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
    }),
  ),
  blockingErrors: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
    }),
  ),
});
export type FixtureGenerationPreview = z.infer<typeof FixtureGenerationPreview>;

export const FixtureGenerationCommitRequest = z.object({
  previewToken: z.string().min(1),
  idempotencyKey: z.string().min(1).max(128),
});
export type FixtureGenerationCommitRequest = z.infer<
  typeof FixtureGenerationCommitRequest
>;

export const ProposeScheduleRequest = z.object({
  proposedStartAt: z.string().datetime(),
  note: z.string().max(500).nullable().optional(),
});
export type ProposeScheduleRequest = z.infer<typeof ProposeScheduleRequest>;

export const ConfirmScheduleRequest = z.object({
  confirmedStartAt: z.string().datetime(),
  overrideNote: z.string().max(500).nullable().optional(),
});
export type ConfirmScheduleRequest = z.infer<typeof ConfirmScheduleRequest>;

export const SubmitResultRequest = z.object({
  games: z
    .array(
      z.object({
        sequence: z.number().int().positive(),
        outcome: z.enum([
          "playerAWin",
          "playerBWin",
          "draw",
          "forfeit",
          "void",
          "unplayed",
          "doubleLoss",
        ]),
        forfeitedSide: z.enum(["A", "B"]).optional(),
      }),
    )
    .max(50),
});
export type SubmitResultRequest = z.infer<typeof SubmitResultRequest>;

export const CorrectResultRequest = SubmitResultRequest;
export type CorrectResultRequest = z.infer<typeof CorrectResultRequest>;

/** Event organiser: finalise as logged, or settle a dispute with the right score. */
export const FinalizeResultRequest = SubmitResultRequest.partial();
export type FinalizeResultRequest = z.infer<typeof FinalizeResultRequest>;

export const DisputeResultRequest = z.object({
  note: z.string().max(500).nullable().optional(),
});
export type DisputeResultRequest = z.infer<typeof DisputeResultRequest>;

/** Add an organiser or appoint the main organiser by the email of a known account. */
export const GroupStaffRequest = z.object({
  email: z.string().email().max(254),
});
export type GroupStaffRequest = z.infer<typeof GroupStaffRequest>;

export const GroupStaffView = z.object({
  customerAccountId: CustomerAccountId,
  displayName: z.string(),
  email: z.string().nullable(),
  role: z.enum(["main_organiser", "organiser"]),
  createdAt: z.string().datetime(),
});
export type GroupStaffView = z.infer<typeof GroupStaffView>;

export const UpdateAvailabilityRequest = z.object({
  timezone: z.string().min(1).max(64),
  slots: z.array(WeeklySlot).max(28),
  note: z.string().max(500).nullable().optional(),
});
export type UpdateAvailabilityRequest = z.infer<typeof UpdateAvailabilityRequest>;

/** A shared free time, shown in the group's timezone, with this week's real instants. */
export const AvailabilityDisplaySlot = WeeklySlot.extend({
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
});
export type AvailabilityDisplaySlot = z.infer<typeof AvailabilityDisplaySlot>;

/** Both players' availability for a fixture, and when they're both free in the next 7 days. */
export const FixtureAvailabilityResponse = z.object({
  timezone: z.string(),
  players: z.array(
    z.object({
      side: z.enum(["A", "B"]),
      displayName: z.string(),
      /** null: a roster-only player, or one who hasn't set their availability. */
      availability: z
        .object({
          timezone: z.string(),
          slots: z.array(WeeklySlot),
          note: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
  bothFree: z.array(AvailabilityDisplaySlot),
});
export type FixtureAvailabilityResponse = z.infer<typeof FixtureAvailabilityResponse>;

/** What the signed-in account may do, for the UI (the API still checks every call). */
export const MyAccessResponse = z.object({
  platformAdmin: z.boolean(),
  groups: z.array(
    z.object({
      competitionId: CompetitionId,
      name: z.string(),
      role: z.enum(["platform_admin", "main_organiser", "organiser"]),
    }),
  ),
});
export type MyAccessResponse = z.infer<typeof MyAccessResponse>;

export const FixtureScheduleActionRequest = z.object({
  note: z.string().max(500).nullable().optional(),
});
export type FixtureScheduleActionRequest = z.infer<typeof FixtureScheduleActionRequest>;

export const StandingsResponse = z.object({
  seasonId: SeasonId,
  standings: z.array(
    Standing.extend({
      displayName: z.string(),
      onlineClientUsername: z.string().nullable(),
      scheduledMatches: z.number().int().min(0),
      recentForm: z.array(z.enum(["W", "D", "L"])).max(5),
    }),
  ),
  rebuiltAt: z.string().datetime(),
});
export type StandingsResponse = z.infer<typeof StandingsResponse>;

export const PublicPlayerFixture = z.object({
  fixtureId: FixtureId,
  roundLabel: z.string(),
  confirmedStartAt: z.string().datetime(),
  opponent: z.object({
    participantId: ParticipantId,
    displayName: z.string(),
    onlineClientUsername: z.string().nullable(),
  }),
});
export type PublicPlayerFixture = z.infer<typeof PublicPlayerFixture>;

export const PublicPlayerResult = PublicPlayerFixture.extend({
  /** Null when the result was entered without a match time (e.g. imported). */
  confirmedStartAt: z.string().datetime().nullable(),
  result: z.enum(["W", "D", "L"]),
  gamesWon: z.number().int().min(0),
  gamesLost: z.number().int().min(0),
});
export type PublicPlayerResult = z.infer<typeof PublicPlayerResult>;

export const PublicPlayerOverview = z.object({
  participantId: ParticipantId,
  seasonId: SeasonId,
  competitionName: z.string(),
  seasonName: z.string(),
  displayName: z.string(),
  onlineClientUsername: z.string().nullable(),
  standing: StandingsResponse.shape.standings.element,
  nextFixture: PublicPlayerFixture.nullable(),
  recentResults: z.array(PublicPlayerResult).max(5),
  /** The player and the rows just above and below them in the table. */
  tableAround: z
    .array(
      z.object({
        participantId: ParticipantId,
        displayName: z.string(),
        rank: z.number().int().positive(),
        matchesPlayed: z.number().int().min(0),
        matchPoints: z.number().int(),
      }),
    )
    .max(5)
    .optional(),
});
export type PublicPlayerOverview = z.infer<typeof PublicPlayerOverview>;

const PublicPlayerRef = z.object({
  participantId: ParticipantId,
  displayName: z.string(),
});

/** An event (season) on public pages (R3). Only an ended event has a winner. */
export const PublicEventSummary = z.object({
  seasonId: SeasonId,
  name: z.string(),
  status: z.enum(["draft", "active", "completed", "archived"]),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  playerCount: z.number().int().min(0),
  matchesPlayed: z.number().int().min(0),
  winner: PublicPlayerRef.nullable(),
  runnerUp: PublicPlayerRef.nullable(),
  leader: PublicPlayerRef.nullable(),
});
export type PublicEventSummary = z.infer<typeof PublicEventSummary>;

/** A public event group with its current and past events (latest first). */
export const PublicCompetitionSummary = z.object({
  competitionId: CompetitionId,
  name: z.string(),
  description: z.string().nullable(),
  timezone: z.string(),
  currentEvents: z.array(PublicEventSummary),
  pastEvents: z.array(PublicEventSummary),
});
export type PublicCompetitionSummary = z.infer<typeof PublicCompetitionSummary>;

/** An event's finalised results, by round. */
export const SeasonResults = z.object({
  seasonId: SeasonId,
  rounds: z.array(
    z.object({
      roundLabel: z.string(),
      fixtures: z.array(
        z.object({
          fixtureId: FixtureId,
          confirmedStartAt: z.string().datetime().nullable(),
          playerA: PublicPlayerRef,
          playerB: PublicPlayerRef,
          gamesA: z.number().int().min(0),
          gamesB: z.number().int().min(0),
          outcome: z.string(),
        }),
      ),
    }),
  ),
});
export type SeasonResults = z.infer<typeof SeasonResults>;

/** A player across all public events (account-linked players are joined up). */
export const PlayerProfile = z.object({
  participantId: ParticipantId,
  displayName: z.string(),
  onlineClientUsername: z.string().nullable(),
  record: z.object({
    events: z.number().int(),
    matchesPlayed: z.number().int(),
    won: z.number().int(),
    drawn: z.number().int(),
    lost: z.number().int(),
    gamesWon: z.number().int(),
    gamesLost: z.number().int(),
    points: z.number().int(),
    titles: z.number().int(),
  }),
  /** Last five results across events, newest first. */
  form: z.array(z.enum(["W", "D", "L"])),
  upcoming: z.array(
    z.object({
      fixtureId: FixtureId,
      seasonId: SeasonId,
      seasonName: z.string(),
      confirmedStartAt: z.string().datetime(),
      opponent: PublicPlayerRef,
    }),
  ),
  events: z.array(
    z.object({
      participantId: ParticipantId,
      competitionId: CompetitionId,
      competitionName: z.string(),
      seasonId: SeasonId,
      seasonName: z.string(),
      status: z.enum(["draft", "active", "completed", "archived"]),
      ended: z.boolean(),
      rank: z.number().int().nullable(),
      playerCount: z.number().int(),
      points: z.number().int(),
      champion: z.boolean(),
      results: z.array(PublicPlayerResult),
    }),
  ),
});
export type PlayerProfile = z.infer<typeof PlayerProfile>;

export const AddStreamLinkRequest = z.object({
  url: z.string().url(),
  label: z.string().max(100).nullable().optional(),
  visibility: z.enum(["organizer_only", "public"]).default("public"),
});
export type AddStreamLinkRequest = z.infer<typeof AddStreamLinkRequest>;

export const PaginatedList = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
  });

export const CompetitionListResponse = PaginatedList(Competition);
export type CompetitionListResponse = z.infer<typeof CompetitionListResponse>;

export const SeasonListResponse = PaginatedList(Season);
export type SeasonListResponse = z.infer<typeof SeasonListResponse>;

export const ParticipantListResponse = PaginatedList(Participant);
export type ParticipantListResponse = z.infer<typeof ParticipantListResponse>;

export const PrivateFixtureListResponse = PaginatedList(PrivateFixture);
export type PrivateFixtureListResponse = z.infer<typeof PrivateFixtureListResponse>;

export const PublicCalendarResponse = PaginatedList(PublicCalendarEntry);
export type PublicCalendarResponse = z.infer<typeof PublicCalendarResponse>;

export const MyFixturesQuery = z.object({
  seasonId: SeasonId.optional(),
  membershipId: MembershipId.optional(),
});
export type MyFixturesQuery = z.infer<typeof MyFixturesQuery>;

export const RegisterRequest = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const GoogleLoginRequest = z.object({
  idToken: z.string().min(1).max(4096),
  allowCreate: z.boolean().optional(),
});
export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequest>;

export const LinkGoogleProviderRequest = z.object({
  idToken: z.string().min(1).max(4096),
});
export type LinkGoogleProviderRequest = z.infer<typeof LinkGoogleProviderRequest>;

export const RefreshTokenRequest = z.object({
  refreshToken: z.string().min(1).max(256),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequest>;

export const AuthTokenResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  tokenType: z.literal("Bearer"),
});
export type AuthTokenResponse = z.infer<typeof AuthTokenResponse>;

export const CustomerAccountView = z.object({
  customerAccountId: CustomerAccountId,
  displayName: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  platformAdmin: z.boolean().optional(),
});
export type CustomerAccountView = z.infer<typeof CustomerAccountView>;

export const UpdateConsentRequest = z.object({
  publicDisplayName: z.boolean(),
  onlineClientUsername: z.boolean(),
  decklists: z.boolean(),
});
export type UpdateConsentRequest = z.infer<typeof UpdateConsentRequest>;

export const CreateSeasonInvitationRequest = z.object({
  email: z.string().email().max(254),
  displayName: z.string().min(1).max(100),
  role: z.literal("participant").default("participant"),
  onlineClientUsername: z.string().max(64).nullable().optional(),
});
export type CreateSeasonInvitationRequest = z.infer<typeof CreateSeasonInvitationRequest>;

export const AddAllowedEmailRequest = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email().max(254)),
  displayName: z.string().min(1).max(100),
});
export type AddAllowedEmailRequest = z.infer<typeof AddAllowedEmailRequest>;

export const AcceptSeasonInvitationRequest = z.object({
  token: z.string().min(1).max(128),
});
export type AcceptSeasonInvitationRequest = z.infer<typeof AcceptSeasonInvitationRequest>;

export const PublicInvitationPreview = z.object({
  email: z.string().email(),
  displayName: z.string(),
  seasonName: z.string(),
  competitionName: z.string(),
  role: z.enum(["organizer", "participant"]),
  expired: z.boolean(),
  accepted: z.boolean(),
  /** For the sign-up link while sign-up is closed (Authentik `itoken`). */
  signupToken: z.string().uuid().nullable(),
});
export type PublicInvitationPreview = z.infer<typeof PublicInvitationPreview>;

export const SubmitDeckRequest = z.object({
  deckRevisionId: z.string().min(1).max(128),
});
export type SubmitDeckRequest = z.infer<typeof SubmitDeckRequest>;

export const HydratedPrintingRow = z.object({
  printingId: z.string(),
  cardId: z.string(),
  name: z.string(),
  setCode: z.string().nullable(),
  rarity: z.string().nullable(),
});
export type HydratedPrintingRow = z.infer<typeof HydratedPrintingRow>;

export const RevealedParticipantDeck = z.object({
  participantId: ParticipantId,
  displayName: z.string(),
  deckRevisionId: z.string(),
  lockedAt: z.string().datetime(),
  printings: z.array(HydratedPrintingRow),
});
export type RevealedParticipantDeck = z.infer<typeof RevealedParticipantDeck>;

export const PublicFixtureDecklists = z.object({
  fixtureId: FixtureId,
  seasonId: SeasonId,
  participantA: RevealedParticipantDeck.nullable(),
  participantB: RevealedParticipantDeck.nullable(),
});
export type PublicFixtureDecklists = z.infer<typeof PublicFixtureDecklists>;

/** Platform admin: fixtures and results from a CSV, or from md-league. */
export const LeagueImportRequest = z.discriminatedUnion("source", [
  z.object({ source: z.literal("csv"), csv: z.string().min(1).max(500_000) }),
  z.object({ source: z.literal("mdleague") }),
]);
export type LeagueImportRequest = z.infer<typeof LeagueImportRequest>;

export const LeagueImportCommitRequest = z.object({ previewToken: z.string().min(1) });
export type LeagueImportCommitRequest = z.infer<typeof LeagueImportCommitRequest>;

/** An https image link, or null to clear it. */
const ImageUrl = z
  .string()
  .trim()
  .url()
  .max(2000)
  .refine((u) => u.startsWith("https://"), "Use an https:// link")
  .nullable();

/** Logo and cover image of an event group, or of one event (overrides the group's). */
export const BrandingRequest = z.object({
  logoUrl: ImageUrl.optional(),
  coverUrl: ImageUrl.optional(),
});
export type BrandingRequest = z.infer<typeof BrandingRequest>;

/** Add or replace an organiser's change to the event's card list. */
export const SetEventCardChangeRequest = z.object({
  cardId: z.string().min(1).max(64).nullable(),
  cardName: z.string().trim().min(1).max(200),
  maxCopies: z.number().int().min(0).max(3).optional(),
  points: z.number().int().min(0).max(100).optional(),
});
export type SetEventCardChangeRequest = z.infer<typeof SetEventCardChangeRequest>;

/**
 * Move an event to a newer official list, now or from its effective date,
 * and say what happens to the organisers' changes it touches (default: keep).
 */
export const AcceptCardListRequest = z.object({
  from: z.enum(["now", "effective_date"]),
  cardActions: z
    .array(
      z.object({
        changeId: z.string().min(1).max(100),
        action: z.enum(["keep", "remove", "set"]),
        /** Copies (0–3) or points (0–100), for "set". */
        value: z.number().int().min(0).max(100).optional(),
      }),
    )
    .max(2048)
    .default([]),
});
export type AcceptCardListRequest = z.infer<typeof AcceptCardListRequest>;

/** An older event's game, set once. */
export const SetEventGameRequest = z.object({ game: EventGame });
export type SetEventGameRequest = z.infer<typeof SetEventGameRequest>;

/** Show an event to everyone, or only to its players and the group's organisers. */
export const SetEventVisibilityRequest = z.object({ visibility: CompetitionVisibility });
export type SetEventVisibilityRequest = z.infer<typeof SetEventVisibilityRequest>;

/** The signed-in player's own details (Account tab). */
export const UpdateMyProfileRequest = z.object({
  displayName: z.string().trim().min(1, "Enter a display name.").max(100),
  onlineClientUsername: z.string().trim().max(64).nullable(),
  konamiId: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "A KONAMI ID is 10 digits.")
    .nullable(),
  /** Master Duel ID; omitted keeps it as it is. */
  masterDuelId: MasterDuelIdInput.nullable().optional(),
});
export type UpdateMyProfileRequest = z.infer<typeof UpdateMyProfileRequest>;
