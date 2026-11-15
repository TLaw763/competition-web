import { z } from "zod";

/** Opaque platform identifiers — format finalized in foundation D-033. */
export const PlatformId = z.string().min(1).max(128);
export type PlatformId = z.infer<typeof PlatformId>;

export const CompetitionId = PlatformId;
export type CompetitionId = z.infer<typeof CompetitionId>;

export const SeasonId = PlatformId;
export type SeasonId = z.infer<typeof SeasonId>;

export const RulesetId = PlatformId;
export type RulesetId = z.infer<typeof RulesetId>;

export const ParticipantId = PlatformId;
export type ParticipantId = z.infer<typeof ParticipantId>;

export const MembershipId = PlatformId;
export type MembershipId = z.infer<typeof MembershipId>;

export const RoundId = PlatformId;
export type RoundId = z.infer<typeof RoundId>;

export const FixtureId = PlatformId;
export type FixtureId = z.infer<typeof FixtureId>;

export const ScheduleProposalId = PlatformId;
export type ScheduleProposalId = z.infer<typeof ScheduleProposalId>;

export const MatchId = PlatformId;
export type MatchId = z.infer<typeof MatchId>;

export const GameId = PlatformId;
export type GameId = z.infer<typeof GameId>;

export const ResultSubmissionId = PlatformId;
export type ResultSubmissionId = z.infer<typeof ResultSubmissionId>;

export const DeckSubmissionId = PlatformId;
export type DeckSubmissionId = z.infer<typeof DeckSubmissionId>;

export const StreamLinkId = PlatformId;
export type StreamLinkId = z.infer<typeof StreamLinkId>;

export const AuditEventId = PlatformId;
export type AuditEventId = z.infer<typeof AuditEventId>;

/** External opaque deck revision reference from Deck Builder (C3+). */
export const DeckRevisionId = z.string().min(1).max(128);
export type DeckRevisionId = z.infer<typeof DeckRevisionId>;

/** Foundation card reference — hydration via card-api only. */
export const CardId = PlatformId;
export type CardId = z.infer<typeof CardId>;

export const PrintingId = PlatformId;
export type PrintingId = z.infer<typeof PrintingId>;

export const CustomerAccountId = PlatformId;
export type CustomerAccountId = z.infer<typeof CustomerAccountId>;

export const SeasonInvitationId = PlatformId;
export type SeasonInvitationId = z.infer<typeof SeasonInvitationId>;

export const GroupStaffId = PlatformId;
export type GroupStaffId = z.infer<typeof GroupStaffId>;

export const PlayerLinkRequestId = PlatformId;
export type PlayerLinkRequestId = z.infer<typeof PlayerLinkRequestId>;

export const EventJoinRequestId = PlatformId;
export type EventJoinRequestId = z.infer<typeof EventJoinRequestId>;

export const ProblemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  code: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetails>;

export const HealthResponse = z.object({
  status: z.literal("ok"),
  service: z.string(),
  deployEnv: z.string(),
  releaseSha: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
