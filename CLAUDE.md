# CLAUDE.md

Owner-specific setup (real hosts, sibling repos, deploy) is in `CLAUDE.local.md`, which is
git-ignored — read it when present.

## Project

**DaGym** — personal gym tracker, a sibling of DaFinance with the same conventions. It runs two ways:

- **Standalone** (what a clone gets): no API, no sign-in, data in the browser.
- **Hosted**: a static SPA behind Cloudflare Access (this app contains no auth code), data in a
  companion central API (`/v1/gym`). The API decides per user where data lives: the owner and
  approved users on the server, everyone else in the browser, with a request for server storage.

It can be launched from a Workspace hub (`VITE_WORKSPACE_URL`, header "← Workspace"; hidden when unset).
The header shows the shared `<tdz-account>` menu (`public/account.js`, canonical copy in the hub repo);
its `account-url` shows where data is stored and sends the storage request.

Never import code, types or env vars from sibling repos: the API is used over HTTP only, `src/lib/types.ts` mirrors its contract.

## Public repository rules

This repository is public. Before every commit:

- **No infrastructure in tracked files**: no real hostnames or URLs of the hub or API, no Cloudflare
  account / database / Access ids, no user emails. Use env vars, placeholders (`https://<api-host>`)
  or generic words. Real values go in git-ignored files: `CLAUDE.local.md`, `.env.production.local`,
  `wrangler.jsonc` (from `wrangler.example.jsonc`), `.claude/dev-real/`.
- Allowed exception: the live app URL, in README only. Never the API or hub hosts.
- **No secrets anywhere**, not even in examples. Anything `VITE_*` is public.

## Language rules

- Code, comments, commits, docs, API fields and stored values (muscle keys, tracking types): English.
- Conversation with the developer: Vietnamese. UI text in `src/locales/en.ts` (reference, default) + `vi.ts`; add every key to both. No hard-coded UI strings.

## Tech stack

- Vite + React 19 + TS + Tailwind v4, react-router-dom 7, Geist fonts. Charts are plain HTML/CSS. Dark only; tokens in `src/index.css` copied from the hub.
- `src/i18n/` and `src/brand/` are copied as-is from DaFinance; `public/account.js` from the hub.
- Data: every read and write goes through the current `GymStore` (`src/lib/storage.ts`: cached GET hooks + writes that `invalidate()` prefixes). `serverStore` calls the API (`src/lib/api.ts`); `localStore(email)` answers the same `/v1/gym` paths from localStorage (`src/lib/localApi.ts`, `dagym.u.<email>.*`, same maths as the API). `AccountGate` reads `GET /v1/gym/account` (`src/lib/account.ts`) and selects the store: `cloud` → server, `local` → browser, `readonly` (revoked) → server data copied into the browser once (`src/lib/sync.ts`). `StorageNotice` asks for server storage and, after approval, moves browser data up with `POST /v1/gym/import`. The API enforces all of this; the frontend only follows it.
- Hosted: `worker/index.js` forwards only `/api/health` and `/api/v1/gym/*` to the API Worker (service binding) with the Access JWT.
- Security: no tokens or secrets in the frontend; React escaping only (no `innerHTML` with data); `public/_headers` sets CSP, `X-Frame-Options`, `noindex`.
- Exercise dictionary: `public/data/exercises.json`, built by `npm run exercises` from free-exercise-db pinned to one commit; images served by jsDelivr. Custom exercises live in the store.
- Live workout: `src/lib/session.ts` (context, hooks) + `src/components/SessionProvider.tsx` — kept in localStorage (`dagym.session`, per browser account `dagym.session.u.<email>`), timers stored as timestamps, debounced PUT autosave, rest alarm (beep + vibrate), screen wake lock.

## Structure

```
src/
├── App.tsx, main.tsx
├── pages/       Dashboard, Programs (list, detail, workout-day edit), Day (day list + swipeable exercise pages, template or live), History (+ detail), Stats, Exercises (+ detail)
├── components/  Layout (tabs Home / Train / Progress / Workout in the header, SectionHeader = sub-tabs), AccountGate, StorageNotice, SessionBar (rest timer), Ring, SwapSheet (similar exercises), ExerciseBlock, PlanEditor, WorkoutEditor, ExercisePicker, MuscleMap, charts, ui
├── config/      muscles (keys, equipment…), colors (template colours), changelog
├── lib/         api, account, storage (GymStore), localApi, sync, types, date, format, plan (items, records), progress (day items, %, current day), programs (current program), exercises, session, sound, useStartWorkout, useDragSort
```

No fixed schedule: a user has several programs (`/programs`); a template is one workout day of a program (`programId`, in `position` order), trained in turn on any date. The day to train is `currentDay()` (in progress, else trained today but unfinished, else the next one). The dashboard's current program is chosen per device (`dagym.program`), else the program of the latest workout. The calendar shows only logged workouts. The API's `/schedule` and `/days` are not used. Routes: `/day/:templateId[/:index]` before starting, `/workout[/:index]` while training. Weekday index: 0 = Monday … 6 = Sunday.

## Modes

| Vite mode | Env file | Data |
|---|---|---|
| `standalone` (`npm run dev`, `build:standalone`) | `.env.standalone` (`VITE_STANDALONE=1`) | browser only, nothing fetched — keep it working, it is how others use the repo |
| `demo` (`npm run dev:demo`) | `.env.demo` | local API on :8787 with sample data (`npm run api:demo`) |
| `real` (`npm run dev:real`) | `.env.real` | local API bound to the real database (`npm run api:real`) — **writes are real** |
| production (`npm run build`) | `.env.production.local` (untracked) | `/api` on the deployed host |

Local D1: `npm run db:migrate:local` in the API repo.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

Before considering work done: `lint` and `build` pass (and `build:standalone`); check mobile and desktop layouts.
