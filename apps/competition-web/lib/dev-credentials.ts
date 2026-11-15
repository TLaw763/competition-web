/** Dev-only default password — matches @enigmic/competition-identity seed accounts. */
export const DEFAULT_DEV_PASSWORD = "dev-password-123";

/** Seeded customer account IDs for local demo linking. */
export const DEV_ACCOUNT_IDS = {
  organizer: "cust-organizer-1",
  alice: "cust-participant-1",
  bob: "cust-participant-2",
  admin: "cust-admin-1",
} as const;

export const DEV_PARTICIPANTS = [
  {
    displayName: "Alice",
    email: "alice@dev.enigmic.invalid",
    customerAccountId: DEV_ACCOUNT_IDS.alice,
  },
  {
    displayName: "Bob",
    email: "bob@dev.enigmic.invalid",
    customerAccountId: DEV_ACCOUNT_IDS.bob,
  },
] as const;
