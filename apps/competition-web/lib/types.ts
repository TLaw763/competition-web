import type { EventGame } from "./games";

export type FixtureSide = "A" | "B" | null;

export type ScheduleProposal = {
  id: string;
  proposedStartAt: string;
  note: string | null;
  /** pending (opponent to answer), accepted (organiser to confirm), acknowledged, superseded, withdrawn */
  status: string;
  proposedBySide: FixtureSide;
};

/** The fixture's current result (D-058): logged, then confirmed/disputed, then finalised. */
export type ResultSubmissionView = {
  id: string;
  state: "submitted" | "confirmed" | "disputed" | "finalized" | "corrected";
  submittedBySide: FixtureSide;
  disputeNote: string | null;
};

export type MatchSummary = {
  id: string;
  sequence: number;
  outcome: string | null;
  pointsPlayerA: number;
  pointsPlayerB: number;
  games: Array<{ sequence: number; outcome: string }>;
};

export type FixtureView = {
  id: string;
  roundId: string;
  seasonId: string;
  state: string;
  confirmedStartAt: string | null;
  opponentDisplayName?: string;
  /** The opponent's Master Duel ID (9 digits), to add each other in the game. */
  opponentMasterDuelId?: string | null;
  myParticipantId?: string;
  isPlayerA?: boolean;
  participantADisplayName?: string;
  participantBDisplayName?: string;
  roundLabel?: string;
  /** One-day events: the round's suggested start. */
  suggestedStartAt?: string | null;
  seasonName?: string;
  competitionId?: string;
  competitionName?: string;
  timezone?: string;
  scheduleProposals: ScheduleProposal[];
  matches: MatchSummary[];
  slots: Array<{ side: "A" | "B"; participantId: string }>;
  resultSubmission?: ResultSubmissionView | null;
};

export type GroupAccessRole = "platform_admin" | "main_organiser" | "organiser";

export type MyAccess = {
  platformAdmin: boolean;
  groups: Array<{ competitionId: string; name: string; role: GroupAccessRole }>;
};

export type GroupStaffMember = {
  customerAccountId: string;
  displayName: string;
  email: string | null;
  role: "main_organiser" | "organiser";
  createdAt: string;
};

export type StandingRow = {
  participantId: string;
  seasonId: string;
  displayName?: string;
  onlineClientUsername?: string | null;
  rank: number;
  matchPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesDrawn: number;
  matchesLost: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  scheduledMatches?: number;
  tiebreakerValues?: Record<string, number>;
  recentForm: Array<"W" | "D" | "L">;
};

/** GET /v1/seasons/:id/swiss (Swiss events only). */
export type SwissStatus = {
  phaseSequence: number;
  label: string;
  roundsTotal: number;
  roundsPaired: number;
  currentRound: {
    id: string;
    sequence: number;
    label: string;
    openFixtures: number;
    byeParticipantId: string | null;
  } | null;
  players: number;
  canPairNext: boolean;
  reason: string | null;
  complete: boolean;
};

export type FormatPlanPreview = {
  template: string;
  templateLabel: string;
  phases: Array<{
    sequence: number;
    label: string;
    kind: string;
    summary: string;
    automationStatus: "available" | "planned";
  }>;
  notes: string[];
};

export type SeasonFormatPlan = {
  id: string;
  seasonId: string;
  template: string;
  phases: Array<{
    sequence: number;
    kind: string;
    label: string;
    leagueMode?: "single_round_robin" | "double_round_robin" | "manual";
    swissRounds?: number;
    cutSize?: number;
    bracketSize?: number;
    bracketStyle?: string;
    status: string;
  }>;
};

export type SeasonParticipantRow = {
  id: string;
  displayName: string;
  onlineClientUsername?: string | null;
  membershipId: string;
  membershipStatus: string;
  droppedAt?: string | null;
  platformAccess: "roster_only" | "platform";
  pendingPlatformInvite: boolean;
  /** A request to link this player to an account, waiting for its owner (organisers only). */
  linkRequest?: { id: string; email: string; createdAt: string } | null;
  /** The player's Master Duel ID (organisers only; 9 digits). */
  masterDuelId?: string | null;
  /** The player's KONAMI ID (organisers only). */
  konamiId?: string | null;
};

/** The signed-in player's own details (GET/PUT /v1/me/profile). */
export type MyProfile = {
  displayName: string;
  onlineClientUsername: string | null;
  masterDuelId: string | null;
  konamiId: string | null;
  saved: boolean;
  participantIds: string[];
};

export type SeasonContext = {
  competitionId: string;
  competitionName: string;
  seasonId: string;
  seasonName: string;
  timezone: string;
};

export type PublicFixtureView = {
  id: string;
  seasonId: string;
  state: string;
  confirmedStartAt: string;
  participantAId: string;
  participantBId: string;
  participantADisplayName: string;
  participantBDisplayName: string;
  participantAUsername?: string | null;
  participantBUsername?: string | null;
  finalizedScore: {
    matches: Array<{ sequence: number; scoreSummary: string }>;
  } | null;
  streamLinks: Array<{ url: string; label: string | null }>;
  revealedDeckRevisionIds?: {
    participantA: string | null;
    participantB: string | null;
  } | null;
};

export type PublicFixtureDecklists = {
  fixtureId: string;
  seasonId: string;
  participantA: {
    participantId: string;
    displayName: string;
    deckRevisionId: string;
    lockedAt: string;
    printings: Array<{
      printingId: string;
      cardId: string;
      name: string;
      setCode: string | null;
      rarity: string | null;
    }>;
  } | null;
  participantB: {
    participantId: string;
    displayName: string;
    deckRevisionId: string;
    lockedAt: string;
    printings: Array<{
      printingId: string;
      cardId: string;
      name: string;
      setCode: string | null;
      rarity: string | null;
    }>;
  } | null;
};

export type PublicCalendarItem = {
  fixtureId: string;
  seasonId: string;
  competitionId: string;
  confirmedStartAt: string;
  participantAId: string;
  participantBId: string;
  participantADisplayName: string;
  participantBDisplayName: string;
  state: string;
  /** Public stream links; missing from an older API. */
  streamLinks?: Array<{ url: string; label: string | null }>;
};

export type PublicPlayerFixture = {
  fixtureId: string;
  roundLabel: string;
  confirmedStartAt: string;
  opponent: {
    participantId: string;
    displayName: string;
    onlineClientUsername: string | null;
  };
};

export type PublicPlayerResult = Omit<PublicPlayerFixture, "confirmedStartAt"> & {
  /** Null when the result was entered without a match time (e.g. imported). */
  confirmedStartAt: string | null;
  result: "W" | "D" | "L";
  gamesWon: number;
  gamesLost: number;
};

export type PublicPlayerOverview = {
  participantId: string;
  seasonId: string;
  competitionName: string;
  seasonName: string;
  displayName: string;
  onlineClientUsername: string | null;
  standing: StandingRow;
  nextFixture: PublicPlayerFixture | null;
  recentResults: PublicPlayerResult[];
  /** The player and the rows just above and below them in the table. */
  tableAround?: Array<{
    participantId: string;
    displayName: string;
    rank: number;
    matchesPlayed: number;
    matchPoints: number;
  }>;
};

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** Wall-clock "HH:MM" in the owner's timezone; `end` may be "24:00". */
export type WeeklySlot = { day: Weekday; start: string; end: string };

export type MyAvailability = {
  timezone: string | null;
  slots: WeeklySlot[];
  note: string | null;
  updatedAt: string | null;
};

export type FixtureAvailability = {
  timezone: string;
  players: Array<{
    side: "A" | "B";
    displayName: string;
    availability: { timezone: string; slots: WeeklySlot[]; note: string | null } | null;
  }>;
  bothFree: Array<WeeklySlot & { startUtc: string; endUtc: string }>;
};

export type PublicPlayerRef = { participantId: string; displayName: string };

/** An event on public pages (R3); only an ended event has a winner. */
export type PublicEventSummary = {
  seasonId: string;
  name: string;
  status: "draft" | "active" | "completed" | "archived";
  startsAt: string | null;
  endsAt: string | null;
  playerCount: number;
  matchesPlayed: number;
  winner: PublicPlayerRef | null;
  runnerUp: PublicPlayerRef | null;
  leader: PublicPlayerRef | null;
};

export type PublicCompetitionSummary = {
  competitionId: string;
  name: string;
  description: string | null;
  timezone: string;
  currentEvents: PublicEventSummary[];
  pastEvents: PublicEventSummary[];
};

export type SeasonResults = {
  seasonId: string;
  rounds: Array<{
    roundLabel: string;
    fixtures: Array<{
      fixtureId: string;
      confirmedStartAt: string | null;
      playerA: PublicPlayerRef;
      playerB: PublicPlayerRef;
      gamesA: number;
      gamesB: number;
      outcome: string;
    }>;
  }>;
};

export type PlayerProfile = {
  participantId: string;
  displayName: string;
  onlineClientUsername: string | null;
  record: {
    events: number;
    matchesPlayed: number;
    won: number;
    drawn: number;
    lost: number;
    gamesWon: number;
    gamesLost: number;
    points: number;
    titles: number;
  };
  form: Array<"W" | "D" | "L">;
  upcoming: Array<{
    fixtureId: string;
    seasonId: string;
    seasonName: string;
    confirmedStartAt: string;
    opponent: PublicPlayerRef;
  }>;
  events: Array<{
    participantId: string;
    competitionId: string;
    competitionName: string;
    seasonId: string;
    seasonName: string;
    status: PublicEventSummary["status"];
    ended: boolean;
    rank: number | null;
    playerCount: number;
    points: number;
    champion: boolean;
    results: PublicPlayerResult[];
  }>;
};

export type RoundSchedule = {
  startAt: string;
  roundMinutes: number;
  breaks: Array<{ afterRound: number; minutes: number }>;
};

/** GET /v1/seasons/:id/schedule */
export type SeasonSchedule = {
  startsAt: string | null;
  endsAt: string | null;
  roundSchedule: RoundSchedule | null;
  rounds: Array<{
    roundId: string;
    label: string;
    suggestedStartAt: string | null;
    matches: number;
    withoutTime: number;
  }>;
  slots: Array<{ round: number; startAt: string; breakAfterMinutes: number | null }>;
};

/** GET /v1/seasons/:id/roster-candidates: the group's people an organiser can add. */
export type RosterCandidate = {
  email: string;
  displayName: string;
  hasAccount: boolean;
  sources: Array<"allowed" | "played">;
  inEvent: boolean;
};

/** GET /v1/seasons/:id/registration: the event's registration and the viewer's place. */
export type RegistrationView = {
  open: boolean;
  closedReason: "closed" | "not_public" | "no_start_date" | "started" | "finished" | null;
  /** Registration closes at the event's start. */
  closesAt: string | null;
  /** The organisers' switch (the dates can still close registration). */
  registrationOpen: boolean;
  viewer: {
    status: "signed_out" | "none" | "pending" | "declined" | "in_event";
    requestId?: string;
  };
  /** An organiser of the group not yet playing in it: "Add myself". */
  canAddSelf: boolean;
};

/** GET /v1/seasons/:id/join-requests (organisers): open requests to join. */
export type JoinRequestRow = {
  id: string;
  displayName: string;
  onlineClientUsername: string | null;
  note: string | null;
  email: string | null;
  /** Already a player in another of the group's events (joins as that player). */
  knownAs: string | null;
  createdAt: string;
};

/** POST /v1/seasons/:id/participants/by-email, one per person. */
export type AddPersonResult = {
  email: string;
  displayName: string;
  /** `link_requested`: already on the roster; asked to confirm they're that player. */
  status: "added" | "invited" | "already_in" | "link_requested";
  delivery?: "emailed" | "has_account" | "failed" | "off";
};

/** GET /v1/seasons/:id/bracket (events with a bracket phase). */
export type BracketSlotView =
  | { kind: "player"; participantId: string; seed: number; displayName: string }
  | { kind: "bye" }
  | { kind: "tbd" };

export type BracketMatchView = {
  key: string;
  a: BracketSlotView;
  b: BracketSlotView;
  winnerId: string | null;
  fixtureId: string | null;
  fixtureState: string | null;
};

export type BracketView = {
  size: number;
  rounds: Array<{ round: number; label: string; matches: BracketMatchView[] }>;
  thirdPlace: BracketMatchView | null;
  championId: string | null;
  complete: boolean;
  placements: Array<{
    place: string;
    players: Array<{ participantId: string; displayName: string }>;
  }>;
};

export type BracketStatus = {
  phaseSequence: number;
  label: string;
  created: boolean;
  seededByCut: boolean;
  cutSize: number | null;
  cutReady: boolean;
  thirdPlace: boolean;
  bracket: BracketView | null;
};

/** POST /v1/seasons/:id/top-cut/preview */
export type TopCutRow = {
  participantId: string;
  displayName: string;
  rank: number;
  matchPoints: number;
  opponentsMatchWinPct: number;
};

export type TopCutPreview = {
  cutSize: number;
  made: TopCutRow[];
  missed: TopCutRow[];
  warnings: string[];
  bracket: BracketView;
};

export type EventPhase = "ongoing" | "upcoming" | "past";

/** An event as a card on the home page and the header of its page. */
export type EventCard = PublicEventSummary & {
  seasonSlug: string;
  groupId: string;
  groupName: string;
  groupSlug: string;
  private: boolean;
  /** Hidden by its organisers: only its players and the organisers see it. */
  hidden: boolean;
  timezone: string;
  phase: EventPhase;
  game: EventGame | null;
  /** Taking join requests now (upcoming public event, organisers opened it). */
  registrationOpen?: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
};

export type EventPageData = {
  group: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    timezone: string;
    private: boolean;
  };
  event: EventCard & { template: string };
  events: Array<{ name: string; slug: string; phase: EventPhase }>;
};

/** An event's matches by round, as anyone who can see the event sees them. */
export type PublicSeasonFixtures = {
  seasonId: string;
  rounds: Array<{
    roundId: string;
    label: string;
    bye: PublicPlayerRef | null;
    fixtures: Array<{
      fixtureId: string;
      state: string;
      confirmedStartAt: string | null;
      playerA: PublicPlayerRef;
      playerB: PublicPlayerRef;
      score: {
        gamesA: number;
        gamesB: number;
        winner: "A" | "B" | null;
        doubleLoss?: boolean;
      } | null;
    }>;
  }>;
};

/** One card on an event's list: the official value and the organiser's change, if any. */
export type EventCardRow = {
  cardId: string | null;
  name: string;
  official: number;
  event: number | null;
  value: number;
  changeId: string | null;
};

/** An event's Ban List / Genesys Points List. */
export type EventCardList = {
  game: EventGame | null;
  kind: "ban_list" | "genesys" | null;
  /** The day whose official list applies (YYYY-MM-DD). */
  effectiveOn: string | null;
  basis?: "start" | "today" | "event";
  official: OfficialRelease | null;
  officialStatus: "ok" | "unavailable" | "missing" | "not_available" | "none";
  /** A newer list the organisers accepted from its effective date. */
  coming?: (OfficialRelease & { rows: ListDiffRow[] }) | null;
  cards: EventCardRow[];
};

export type OfficialRelease = {
  releaseId: string;
  effectiveFrom: string;
  sourceUrl: string;
};

/** One card a newer official list changes. */
export type ListDiffRow = {
  cardId: string;
  name: string;
  before: number;
  after: number;
  status: "added" | "removed" | "changed";
  /** The organisers' own change for this card (kept unless they drop it). */
  eventChange: { changeId: string; value: number } | null;
};

export type ListDiffSummary = {
  added: number;
  changed: number;
  removed: number;
  conflicts: number;
};

/** A newer official list for an event (organisers). */
export type CardListOffer = OfficialRelease & {
  status: "pending" | "rejected";
  decidedAt: string | null;
  summary: ListDiffSummary;
  rows: ListDiffRow[];
};

export type CardListUpdates = {
  kind: "ban_list" | "genesys";
  current: OfficialRelease | null;
  /** Accepted from its effective date, not in effect yet. */
  next:
    | (OfficialRelease & {
        acceptedBy: string;
        acceptedAt: string;
        summary: ListDiffSummary;
        rows: ListDiffRow[];
      })
    | null;
  releases: CardListOffer[];
  pendingCount: number;
};

/** Events the signed-in organiser runs with a newer list to look at. */
export type MyCardListUpdates = {
  items: Array<{
    seasonId: string;
    seasonName: string;
    competitionId: string;
    competitionName: string | null;
    game: EventGame;
    pending: Array<Omit<CardListOffer, "rows">>;
    next: (OfficialRelease & { summary: ListDiffSummary }) | null;
  }>;
  unavailable: boolean;
};
