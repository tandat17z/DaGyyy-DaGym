// Builds public/data/exercises.json from free-exercise-db (https://github.com/yuhonas/free-exercise-db,
// public domain / Unlicense). Pinned to one commit so ids and image paths never move under saved data.
// Run: `npm run exercises` (only when updating the catalog; the output is committed).
import { readdir, readFile, writeFile } from 'node:fs/promises'

const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5'
const SOURCE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/dist/exercises.json`

// Static holds are logged in seconds rather than reps (plus a few bodyweight ones by name).
const TIMED = /\b(plank|hold|wall sit|l-sit|hollow body)\b/i
const TIMED_BODYWEIGHT = /\b(side bridge|dead hang)\b/i
const DYNAMIC = /\b(clean|snatch|jerk|push up)\b/i

/** How a set of this exercise is logged: reps × kg, reps only, seconds, or distance + time. */
function trackingType(e) {
  if (e.category === 'cardio') return 'distance_time'
  if (e.category === 'stretching') return 'time'
  if (!DYNAMIC.test(e.name) && (TIMED.test(e.name) || (TIMED_BODYWEIGHT.test(e.name) && e.equipment === 'body only'))) return 'time'
  if (e.equipment === 'body only' || e.equipment === 'foam roll' || e.equipment === 'exercise ball') return 'reps'
  return 'reps_weight'
}

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`${SOURCE}: HTTP ${res.status}`)
const source = await res.json()

// Vietnamese names and steps (scripts/vi/part-*.json, keyed by id): nv / iv.
const vi = {}
const viDir = new URL('./vi/', import.meta.url)
for (const f of (await readdir(viDir)).filter((f) => /^part-\d+\.json$/.test(f))) Object.assign(vi, JSON.parse(await readFile(new URL(f, viDir), 'utf8')))

// Short keys keep the file small; src/components/ExercisesProvider.tsx expands them.
const exercises = source
  .map((e) => ({
    id: e.id,
    n: e.name,
    c: e.category,
    q: e.equipment ?? null,
    l: e.level,
    f: e.force ?? null,
    m: e.mechanic ?? null,
    p: e.primaryMuscles,
    s: e.secondaryMuscles,
    i: e.instructions,
    img: e.images,
    t: trackingType(e),
    ...(vi[e.id]?.n ? { nv: vi[e.id].n } : {}),
    ...(vi[e.id]?.i?.length === e.instructions.length ? { iv: vi[e.id].i } : {}),
  }))
  .sort((a, b) => a.n.localeCompare(b.n))

const out = { source: 'free-exercise-db', commit: COMMIT, imageBase: `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/exercises/`, exercises }
await writeFile(new URL('../public/data/exercises.json', import.meta.url), JSON.stringify(out))
console.log(`Wrote ${exercises.length} exercises, ${exercises.filter((e) => e.nv).length} with Vietnamese names, ${exercises.filter((e) => e.iv).length} with Vietnamese steps`)
