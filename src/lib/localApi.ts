import { ApiError } from './api'
import type { CustomExercise, ExerciseStats, HistorySession, LoggedExercise, Program, Records, SetValues, StatsDay, Template, Workout } from './types'

// The `/v1/gym` API in this browser (localStorage), for users without server storage and the
// standalone build. Same paths, same response shapes and the same maths as the API
// (`../api/src/apps/gym`), so the screens do not know which one they talk to. Data is keyed by
// email, so two accounts signed in on one browser never see each other's data.

type Collection = 'programs' | 'templates' | 'exercises' | 'workouts'
export const COLLECTIONS: Collection[] = ['programs', 'templates', 'exercises', 'workouts']

export const localKey = (owner: string, what: Collection | 'pulled') => `dagym.u.${owner.toLowerCase()}.${what}`

export function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    const list: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? (list as T[]) : []
  } catch {
    return []
  }
}

export function writeList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    throw new ApiError(0, 'local_storage', 'This browser refused to save the data (storage full or blocked)')
  }
}

const now = () => new Date().toISOString()
const round1 = (n: number) => Math.round(n * 10) / 10
const notFound = (what: string) => new ApiError(404, 'not_found', `${what} not found`)

// --- maths, as in the API (logic.ts) ------------------------------------------------------------

interface SetRow extends SetValues {
  workoutId: string
  date: string
  startedAt: string
  status: Workout['status']
  exerciseId: string
  muscle: string
}

/** Completed sets of every workout, in display order. */
function setRows(workouts: Workout[]): SetRow[] {
  const rows: SetRow[] = []
  for (const w of workouts)
    for (const ex of w.exercises)
      for (const s of ex.sets)
        if (s.done)
          rows.push({ workoutId: w.id, date: w.date, startedAt: w.startedAt, status: w.status, exerciseId: ex.exerciseId, muscle: ex.muscle, reps: s.reps ?? null, weight: s.weight ?? null, seconds: s.seconds ?? null, distance: s.distance ?? null })
  return rows
}

function totals(exercises: LoggedExercise[]) {
  let totalSets = 0
  let totalReps = 0
  let volumeKg = 0
  for (const ex of exercises)
    for (const s of ex.sets) {
      if (!s.done) continue
      totalSets++
      totalReps += s.reps ?? 0
      volumeKg += (s.reps ?? 0) * (s.weight ?? 0)
    }
  return { totalSets, totalReps, volumeKg: round1(volumeKg) }
}

function e1rm(reps: number | null | undefined, weight: number | null | undefined) {
  if (!reps || !weight || reps < 1) return 0
  if (reps === 1) return weight
  return weight * (1 + Math.min(reps, 12) / 30)
}

function records(rows: SetValues[]): Records {
  const r: Records = { maxWeight: 0, bestE1rm: 0, maxReps: 0, maxSeconds: 0, maxDistance: 0, maxSetVolume: 0 }
  for (const s of rows) {
    r.maxWeight = Math.max(r.maxWeight, s.weight ?? 0)
    r.bestE1rm = Math.max(r.bestE1rm, e1rm(s.reps, s.weight))
    r.maxReps = Math.max(r.maxReps, s.reps ?? 0)
    r.maxSeconds = Math.max(r.maxSeconds, s.seconds ?? 0)
    r.maxDistance = Math.max(r.maxDistance, s.distance ?? 0)
    r.maxSetVolume = Math.max(r.maxSetVolume, (s.reps ?? 0) * (s.weight ?? 0))
  }
  return { maxWeight: round1(r.maxWeight), bestE1rm: round1(r.bestE1rm), maxReps: round1(r.maxReps), maxSeconds: round1(r.maxSeconds), maxDistance: round1(r.maxDistance), maxSetVolume: round1(r.maxSetVolume) }
}

const values = ({ reps, weight, seconds, distance }: SetValues): SetValues => ({ reps, weight, seconds, distance })
/** Newest first: date, then start time. */
const newest = (a: { date: string; startedAt: string }, b: { date: string; startedAt: string }) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt)

// --- the router -----------------------------------------------------------------------------------

/** Handles `path` (relative to /v1/gym, with its query) like the API would. */
export function localRequest<T>(owner: string, path: string, init: RequestInit = {}): Promise<T> {
  try {
    return Promise.resolve(route(owner, path, (init.method ?? 'GET').toUpperCase(), init.body) as T)
  } catch (e) {
    return Promise.reject(e)
  }
}

function route(owner: string, path: string, method: string, rawBody: BodyInit | null | undefined): unknown {
  const url = new URL(path, 'http://local')
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  const q = url.searchParams
  const body = typeof rawBody === 'string' ? (JSON.parse(rawBody) as Record<string, unknown>) : {}
  const [head, id] = parts
  const key = (what: Collection) => localKey(owner, what)

  if (head === 'me' && method === 'GET') return { email: owner }

  // Plain documents: programs, templates (workout days), custom exercises.
  if ((head === 'programs' || head === 'templates' || head === 'exercises') && parts.length <= 2) {
    const k = key(head)
    const list = readList<{ id: string; position?: number; name?: string }>(k)
    if (method === 'GET' && !id) {
      const sorted = head === 'exercises' ? [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' })) : [...list].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      return { [head]: sorted }
    }
    if (method === 'PUT' && id) {
      const doc = { ...body, id, updatedAt: now() }
      if (head === 'templates') (doc as Partial<Template>).programId ??= null
      const i = list.findIndex((x) => x.id === id)
      if (i >= 0) list[i] = doc
      else list.push(doc)
      writeList(k, list)
      return { [head.slice(0, -1)]: doc }
    }
    if (method === 'DELETE' && id) {
      if (!list.some((x) => x.id === id)) throw notFound(head.slice(0, -1))
      writeList(k, list.filter((x) => x.id !== id))
      // A program takes its workout days with it; logged workouts stay.
      if (head === 'programs') writeList(key('templates'), readList<Template>(key('templates')).filter((t) => t.programId !== id))
      return undefined
    }
  }

  if (head === 'workouts') {
    const k = key('workouts')
    const list = readList<Workout>(k)
    if (method === 'GET' && !id) {
      const from = q.get('from')
      const to = q.get('to')
      const status = q.get('status')
      const limit = Math.min(500, Number(q.get('limit') ?? 200) || 200)
      return { workouts: list.filter((w) => (!from || w.date >= from) && (!to || w.date <= to) && (!status || w.status === status)).sort(newest).slice(0, limit) }
    }
    if (method === 'GET' && id) {
      const w = list.find((x) => x.id === id)
      if (!w) throw notFound('Workout')
      return { workout: w }
    }
    if (method === 'PUT' && id) {
      const w = { ...(body as unknown as Workout), id, templateId: (body.templateId as string | null | undefined) ?? null, finishedAt: (body.finishedAt as string | null | undefined) ?? null, ...totals((body.exercises as LoggedExercise[]) ?? []), updatedAt: now() }
      const i = list.findIndex((x) => x.id === id)
      if (i >= 0) list[i] = w
      else list.push(w)
      writeList(k, list)
      return { workout: w }
    }
    if (method === 'DELETE' && id) {
      if (!list.some((x) => x.id === id)) throw notFound('Workout')
      writeList(k, list.filter((x) => x.id !== id))
      return undefined
    }
  }

  if (method === 'GET' && head === 'stats') {
    const from = q.get('from') ?? ''
    const to = q.get('to') ?? ''
    const done = readList<Workout>(key('workouts')).filter((w) => w.status === 'done' && w.date >= from && w.date <= to)
    const days = new Map<string, StatsDay>()
    for (const w of done) {
      const d = days.get(w.date) ?? { date: w.date, workouts: 0, durationSec: 0, sets: 0, reps: 0, volumeKg: 0 }
      d.workouts++
      d.durationSec += w.durationSec
      d.sets += w.totalSets ?? 0
      d.reps += w.totalReps ?? 0
      d.volumeKg = round1(d.volumeKg + (w.volumeKg ?? 0))
      days.set(w.date, d)
    }
    const byDay = [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
    const rows = setRows(done)
    const muscles = new Map<string, number>()
    const exercises = new Map<string, { exerciseId: string; sets: number; volumeKg: number; ids: Set<string> }>()
    for (const r of rows) {
      muscles.set(r.muscle, (muscles.get(r.muscle) ?? 0) + 1)
      const e = exercises.get(r.exerciseId) ?? { exerciseId: r.exerciseId, sets: 0, volumeKg: 0, ids: new Set<string>() }
      e.sets++
      e.volumeKg += (r.reps ?? 0) * (r.weight ?? 0)
      e.ids.add(r.workoutId)
      exercises.set(r.exerciseId, e)
    }
    const sum = (k: 'workouts' | 'durationSec' | 'sets' | 'reps' | 'volumeKg') => byDay.reduce((n, d) => n + d[k], 0)
    return {
      range: { from, to },
      totals: { workouts: sum('workouts'), durationSec: sum('durationSec'), sets: sum('sets'), reps: sum('reps'), volumeKg: round1(sum('volumeKg')) },
      byDay,
      byMuscle: [...muscles].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets),
      byExercise: [...exercises.values()]
        .map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, volumeKg: round1(e.volumeKg), workouts: e.ids.size }))
        .sort((a, b) => b.sets - a.sets)
        .slice(0, 30),
    }
  }

  // Previous sets and records per exercise, leaving out the workout being logged.
  if (method === 'GET' && head === 'exercise-stats') {
    const ids = [...new Set((q.get('ids') ?? '').split(',').filter(Boolean))].slice(0, 50)
    const exclude = q.get('exclude') ?? ''
    const rows = setRows(readList<Workout>(key('workouts')).filter((w) => w.id !== exclude))
    const stats: Record<string, ExerciseStats> = {}
    for (const exId of ids) {
      const mine = rows.filter((r) => r.exerciseId === exId)
      const latest = [...mine].sort(newest)[0]
      stats[exId] = {
        last: latest ? { workoutId: latest.workoutId, date: latest.date, sets: mine.filter((r) => r.workoutId === latest.workoutId).map(values) } : null,
        records: records(mine),
      }
    }
    return { stats }
  }

  // Recent sessions of one exercise (newest first) and its all-time records.
  if (method === 'GET' && head === 'exercise-history' && id) {
    const limit = Math.min(200, Number(q.get('limit') ?? 30) || 30)
    const mine = setRows(readList<Workout>(key('workouts'))).filter((r) => r.exerciseId === id)
    const sessions: HistorySession[] = []
    for (const r of [...mine].sort(newest)) {
      let s = sessions.find((x) => x.workoutId === r.workoutId)
      if (!s) {
        if (sessions.length >= limit) continue
        s = { workoutId: r.workoutId, date: r.date, sets: [], records: records([]) }
        sessions.push(s)
      }
      s.sets.push(values(r))
    }
    for (const s of sessions) s.records = records(s.sets)
    return { sessions, records: records(mine) }
  }

  throw new ApiError(404, 'not_found', 'Not found')
}

/** Everything this browser holds for `owner`, per collection. */
export function localData(owner: string) {
  return {
    programs: readList<Program>(localKey(owner, 'programs')),
    templates: readList<Template>(localKey(owner, 'templates')),
    exercises: readList<CustomExercise>(localKey(owner, 'exercises')),
    workouts: readList<Workout>(localKey(owner, 'workouts')),
  }
}

export function clearLocal(owner: string) {
  for (const what of [...COLLECTIONS, 'pulled'] as const) {
    try {
      localStorage.removeItem(localKey(owner, what))
    } catch {
      // Blocked storage: nothing to clear.
    }
  }
}
