/**
 * Dev-only UI (seeded-account sign-in, demo league setup, local URLs). Shown in
 * `pnpm dev`; hidden in every `next build`, including Vercel deployments, where
 * the seeded accounts don't exist.
 */
export const DEV_TOOLS = process.env.NODE_ENV !== "production";
