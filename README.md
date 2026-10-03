# DaGym

Personal gym tracker (sibling of DaFinance). Live: https://gym.tandat17z.workers.dev (behind Cloudflare
Access). Runs standalone too: clone it and everything stays in your browser.

## Features

- **Programs**: several programs, each a list of workout days (e.g. Chest, Back, Legs) trained in
  order on any date; no fixed weekly schedule. Each day: exercises with sets × kg × reps and rest.
- **Home**: the current program, the next 3 workout days with progress rings, and a calendar of
  what was actually trained.
- **Workout**: one page per exercise (swipe left / right): target, rest and sets rings, quick
  kg × reps logging, history. Rest timer with sound, screen kept on, autosave; when every set is
  done a countdown opens the next exercise and, after the last one, finishes the workout. An
  exercise can be swapped for a similar one (same muscle group) for that workout only.
- **Progress**: workout history (editable) and statistics by day, week and muscle group, records.
- **Exercises**: 870+ illustrated exercises (free-exercise-db) plus your own.

## Getting started (no server needed)

Requires Node.js 20+. Clone, then:

```bash
npm install
npm run dev                # http://localhost:5176 — standalone, no API, no sign-in
npm run build:standalone   # → dist/, a static site for any host (SPA fallback to index.html)
```

Standalone keeps everything in this browser (`localStorage`): nothing leaves your machine, and
clearing site data or switching browsers loses it.

## With the API (the hosted version)

The hosted app stores data in a companion central API (a Cloudflare Worker with a D1 database, not
in this repo, routes `/v1/gym/*`); `src/lib/types.ts` mirrors its contract. The API decides per
user where data lives: the owner and approved users on the server, everyone else in their browser
(same screens, same maths), with a button to ask the owner for server storage; once approved, the
browser data is moved up. The browser calls `/api/*` on this same host and `worker/index.js`
forwards only `/api/health` and `/api/v1/gym/*` to the API Worker, so one Access login covers the
app and its data. The workout in progress is also kept in localStorage so a reload or a locked
phone loses nothing.

```bash
npm run dev:demo   # http://localhost:5176, expects the API on http://localhost:8787 (npm run api:demo)
npm run lint
npm run build      # tsc -b && vite build → dist/
```

Settings are Vite env files: `.env.standalone`, `.env.demo` (local sample data), `.env.real` (local
API bound to the real database — writes are real) and `.env.example`. No secrets belong in them:
anything prefixed `VITE_` ends up in the browser bundle.

## Deploy

Copy `wrangler.example.jsonc` to `wrangler.jsonc` (git-ignored) and set the API host. One time, in
the API repo (see its README, section "gym"):

1. `npx wrangler d1 create gym`, then uncomment the `DB_GYM` block under `[env.production]` in
   `wrangler.toml` with the printed id.
2. Back up core, then `npx wrangler d1 migrations apply gym --remote --env production` and
   `npx wrangler d1 migrations apply core --remote --env production` (registers the `gym` app).
3. Deploy the API: `npx wrangler deploy --env production`.

Then this app:

```bash
npm run build
npx wrangler deploy
```

Put `gym.tandat17z.workers.dev` behind a Cloudflare Access application (same as DaFinance), then
add that application's AUD tag to the API's comma-separated `ACCESS_AUD` secret
(`npx wrangler secret put ACCESS_AUD --env production` in the API repo), otherwise every API call is
rejected with 401.

## Changelog

In the app (version badge in the header) and in `src/config/changelog.ts`.
