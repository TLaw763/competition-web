import type { CardId, CustomerAccountId, DeckRevisionId, PrintingId } from "./ids.js";
import type { ApplicationRole } from "./enums.js";

/** Session context resolved by competition-api before handler logic. */
export type AuthenticatedSession = {
  customerAccountId: CustomerAccountId;
  displayName: string;
  email?: string;
  emailVerified?: boolean;
  platformAdmin?: boolean;
  roles: ApplicationRole[];
};

/** Base identity payload from IdentityPort before competition roles are applied. */
export type IdentitySession = Omit<AuthenticatedSession, "roles"> & {
  roles?: ApplicationRole[];
  /** Authentik's user number, when the token carries it (`ak_pk`). */
  authentikPk?: number;
};

/** Development-only mock identity (C0–C1 incubation). */
export type MockIdentityRecord = {
  customerAccountId: CustomerAccountId;
  email: string;
  displayName: string;
  roles: ApplicationRole[];
};

/**
 * Replaceable port for customer identity (D-037/D-038).
 * Mock implementation during C0–C1; production adapter in C2.
 */
export type IdentityPort = {
  verifyAccessToken(token: string): Promise<IdentitySession | null>;
  getSessionByAccountId(accountId: CustomerAccountId): Promise<IdentitySession | null>;
};

/** Minimal card projection returned by hydration — no canonical text persisted. */
export type HydratedCard = {
  cardId: CardId;
  name: string;
  typeLine: string;
};

export type HydratedPrinting = {
  printingId: PrintingId;
  cardId: CardId;
  setCode: string | null;
  rarity: string | null;
};

export type CardHydrationRequest = {
  cardIds?: CardId[];
  printingIds?: PrintingId[];
};

export type CardHydrationResult = {
  cards: HydratedCard[];
  printings: HydratedPrinting[];
  unavailableIds: string[];
};

/**
 * Replaceable port for foundation card-api read-only hydration (D-032 cap: 50 IDs).
 * Mock implementation during scaffold/C0; HTTP adapter when Phase 2 card-api is ready.
 */
export type CardHydrationPort = {
  readonly maxIdsPerRequest: number;
  hydrate(request: CardHydrationRequest): Promise<CardHydrationResult>;
};

/** Locked deck snapshot metadata from Deck Builder (C3+). */
export type DeckRevisionSnapshot = {
  deckRevisionId: DeckRevisionId;
  participantLabel: string;
  printingIds: PrintingId[];
  lockedAt: string;
  legalitySnapshotRef: string | null;
};

/**
 * Replaceable port for Deck Builder revision API.
 * Nullable deckRevisionId permitted until C3 integration.
 */
export type DeckRevisionPort = {
  lockRevision(
    deckRevisionId: DeckRevisionId,
    matchContext: { matchId: string; participantId: string },
  ): Promise<DeckRevisionSnapshot>;
  getRevision(deckRevisionId: DeckRevisionId): Promise<DeckRevisionSnapshot | null>;
};

/** One card on an official list: copies for a ban list, points for Genesys. */
export type OfficialListEntry = {
  cardId: string;
  name: string | null;
  maxCopies?: number;
  points?: number;
};

/** A published official list (immutable); it may take effect in the future. */
export type OfficialListRelease = {
  releaseId: string;
  effectiveFrom: string;
  sourceUrl: string;
};

export type OfficialCardList = OfficialListRelease & {
  entries: OfficialListEntry[];
};

/** card-api formats with an official list. */
export type OfficialListFormat = "tcg_advanced" | "genesys" | "master_duel";

/** Official ban lists and Genesys points, and card search, from card-api (read-only). */
export type CardListPort = {
  /** The list in effect on a day (YYYY-MM-DD); null when card-api has none. */
  officialList(format: OfficialListFormat, day: string): Promise<OfficialCardList | null>;
  /** Published releases, newest effective date first, including ones not in effect yet. */
  releases(format: OfficialListFormat): Promise<OfficialListRelease[]>;
  /** One release's cards. */
  releaseEntries(releaseId: string): Promise<OfficialListEntry[]>;
  searchCards(query: string): Promise<Array<{ cardId: string; name: string }>>;
};

/** Aggregate ports injected into competition-api at startup. */
export type IntegrationPorts = {
  identity: IdentityPort;
  cardHydration: CardHydrationPort;
  deckRevision: DeckRevisionPort;
  /** Optional so hand-built test ports still work; the mock is used when missing. */
  cardLists?: CardListPort;
};
