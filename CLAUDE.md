# CLAUDE.md

## Project

**DaGym** — personal gym tracker, one app in the tandat17z ecosystem (sibling of DaFinance, same conventions). Worker `gym` → `gym.tandat17z.workers.dev`, private behind Cloudflare Access (no auth code here). Launched from the hub (`../../hub`) as a card in `hub/src/config/apps.ts`.

Never import code, types or env vars from sibling repos: the API is used over HTTP only, `src/lib/types.ts` mirrors its contract (`../api/src/apps/gym`).

## Language rules

- Code, comments, commits, docs, API fields and stored values (muscle keys, tracking types): English.
- Conversation with the developer: Vietnamese. UI text in `src/locales/en.ts` (reference) + `vi.ts` (default); add every key to both. No hard-coded UI strings.

## Tech stack

- Vite + React 19 + TS + Tailwind v4, react-router-dom 7, Geist fonts. Charts are plain HTML/CSS. Dark only; tokens in `src/index.css` copied from the hub.
- `src/i18n/` and `src/brand/` are copied as-is from DaFinance.
- Data: central API `/v1/gym` (`src/lib/api.ts`, `src/lib/storage.ts` = cached GET hooks + writes that `invalidate()` prefixes). `worker/index.js` forwards `/api/*` to the API Worker.
- Exercise dictionary: `public/data/exercises.json`, built by `npm run exercises` from free-exercise-db pinned to one commit; images served by jsDelivr. Custom exercises live in the API.
- Live workout: `src/lib/session.ts` (context, hooks) + `src/components/SessionProvider.tsx` — kept in localStorage (`dagym.session`), timers stored as timestamps, debounced PUT autosave, rest alarm (beep + vibrate), screen wake lock.

## Structure

```
src/
├── App.tsx, main.tsx
├── pages/       Today, Plan (+ day sheet), Templates (+ TemplateEdit, DayEdit), Workout, History (+ detail), Stats, Exercises (+ detail)
├── components/  Layout (header like DaFinance), SessionBar (rest timer), ExerciseBlock, PlanEditor, WorkoutEditor, ExercisePicker, MuscleMap, charts, ui
├── config/      muscles (keys, equipment…), colors (template colours), changelog
├── lib/         api, storage, types, date, format, plan (resolve plan, records), exercises, session, sound, useStartWorkout
```

Weekday index: 0 = Monday … 6 = Sunday. A day's plan = its override (`/days`) or else the weekly schedule.

## Local data

| | demo (default) | real |
|---|---|---|
| frontend | `npm run dev` → :5176 | `npm run dev:real` → :5177 |
| API | `npm run api:demo` → :8787 (local D1) | `npm run api:real` → :8789, production D1 via git-ignored `.claude/dev-real/` |

Local D1: `npm run db:migrate:local` in `../api`.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

Before considering work done: `lint` and `build` pass; check mobile and desktop layouts.
