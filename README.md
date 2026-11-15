# Enigmic Competition Tools: web front end

League and tournament software in live use by a real Master Duel league: public
calendars, standings, schedule proposals, organiser tools, single sign-on and
invite-only sign-up.

This is a **read-only public snapshot** of the front end. It is published from a
private monorepo, which also holds the API, domain logic (pairing, scoring,
standings, format plans), database layer and infrastructure. Those parts are not
included.

## What's here

```text
apps/competition-web/           Next.js app and same-origin BFF (UI + server routes)
packages/competition-contracts/ Zod schemas shared with the private API
vendor/                         Shared Enigmic UI kit (@enigmic-co/ui), vendored tarball
```

- The browser only talks to the Next.js server. Server routes call the private
  competition API, which sits behind Cloudflare Access, using a service token.
  No API secret reaches the client.
- Sign-in is OIDC (authorisation code flow) against a self-hosted identity
  provider. Sessions live in an encrypted, HTTP-only cookie.
- Contracts are Zod schemas aligned with an OpenAPI spec, so requests and
  responses are validated at the boundary.
- System, light and dark themes, with a pre-paint script to avoid a flash of the
  wrong theme.

## Running it

The app needs the private API to show data, so it is mainly here to read. It
still builds on its own:

```bash
corepack enable
pnpm install
pnpm turbo run build --filter=@enigmic/competition-web...
```

Environment variables used by the server side: `COMPETITION_API_URL`,
`COMPETITION_API_ACCESS_CLIENT_ID`, `COMPETITION_API_ACCESS_CLIENT_SECRET`,
`AUTH_OIDC_ISSUER`, `AUTH_OIDC_CLIENT_ID`, `AUTH_OIDC_CLIENT_SECRET`,
`AUTH_SECRET`, `WEB_BASE_URL`.

Built by [Diego Aquino](https://portfolio.enigmic.co.za).
