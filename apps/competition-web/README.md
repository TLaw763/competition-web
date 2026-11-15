# competition-web

Next.js public app and same-origin BFF for Competition Tools.

**Status:** C1 runnable — calendar, standings, my fixtures, organizer board, theme modes.

## Run locally

Start the API first, then the web app:

```bash
pnpm --filter @enigmic/competition-api dev
pnpm --filter @enigmic/competition-web dev
# http://localhost:3001
```

Set `COMPETITION_API_URL=http://localhost:4000` if the API runs elsewhere.

## UI surfaces

- Public league calendar (`/calendar`) — confirmed fixtures only
- Standings (`/standings`)
- Participant **My fixtures** (`/my-fixtures`) — schedule proposals
- Organizer board (`/organizer`) — league setup and fixture generation

## Theme modes (D-049)

System (default), light, and dark modes with pre-paint script to avoid flash.
Toggle via the header control; preference persists in `localStorage`.

## BFF

Browser requests go to `/api/bff/*`, which proxies to `competition-api` server-side.
