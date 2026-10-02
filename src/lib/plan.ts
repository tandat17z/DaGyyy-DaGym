import type { Exercise, ExerciseStats, LoggedExercise, LoggedSet, PlanItem, Records, SetValues, TrackingType, Workout } from './types'

/** Default targets for an exercise added to a plan. */
export function defaultSets(type: TrackingType, count = 3): SetValues[] {
  const one: SetValues = type === 'time' ? { seconds: 30 } : type === 'distance_time' ? { distance: null, seconds: 600 } : { reps: 10, weight: null }
  return Array.from({ length: count }, () => ({ ...one }))
}

export function planItemFor(e: Exercise): PlanItem {
  return { exerciseId: e.id, restSec: e.trackingType === 'distance_time' ? 0 : 90, note: '', sets: defaultSets(e.trackingType) }
}

export function loggedExerciseFor(item: PlanItem, exercise: Exercise | undefined): LoggedExercise {
  const trackingType = item.trackingType ?? exercise?.trackingType ?? 'reps_weight'
  const sets = item.sets.length ? item.sets : defaultSets(trackingType, 1)
  return {
    exerciseId: item.exerciseId,
    name: exercise?.name ?? item.exerciseId,
    muscle: exercise?.primaryMuscles[0] ?? '',
    trackingType,
    restSec: item.restSec,
    note: item.note,
    sets: sets.map((s) => ({ reps: s.reps ?? null, weight: s.weight ?? null, seconds: s.seconds ?? null, distance: s.distance ?? null, done: false })),
  }
}

export function newWorkout(opts: { date: string; name: string; templateId?: string | null; items: PlanItem[]; byId: Map<string, Exercise> }): Workout {
  return {
    id: crypto.randomUUID(),
    date: opts.date,
    name: opts.name,
    templateId: opts.templateId ?? null,
    status: 'active',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationSec: 0,
    note: '',
    exercises: opts.items.map((i) => loggedExerciseFor(i, opts.byId.get(i.exerciseId))),
  }
}

/** Plan items from a logged workout (to save it as a template or repeat it): completed values become targets. */
export function itemsFromWorkout(w: Workout): PlanItem[] {
  return w.exercises.map((ex) => {
    const done = ex.sets.filter((s) => s.done)
    const sets = (done.length ? done : ex.sets).map(({ reps, weight, seconds, distance }) => ({ reps, weight, seconds, distance }))
    return { exerciseId: ex.exerciseId, trackingType: ex.trackingType, restSec: ex.restSec, note: ex.note, sets }
  })
}

// --- numbers ------------------------------------------------------------------------------------

/** Estimated one-rep max (Epley), same formula as the API. */
export function e1rm(reps: number | null | undefined, weight: number | null | undefined): number {
  if (!reps || !weight || reps < 1) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + Math.min(reps, 12) / 30) * 10) / 10
}

export const doneSets = (w: Workout) => w.exercises.flatMap((e) => e.sets.filter((s) => s.done))

export function workoutTotals(w: Workout) {
  const sets = doneSets(w)
  return {
    sets: sets.length,
    reps: sets.reduce((n, s) => n + (s.reps ?? 0), 0),
    volumeKg: Math.round(sets.reduce((n, s) => n + (s.reps ?? 0) * (s.weight ?? 0), 0) * 10) / 10,
  }
}

/** Kinds of record a completed set beats, compared with the records from before this workout. */
export function setRecords(set: LoggedSet, type: TrackingType, before: Records | undefined): ('weight' | 'e1rm' | 'reps' | 'seconds' | 'distance')[] {
  if (!set.done || !before) return []
  const out: ('weight' | 'e1rm' | 'reps' | 'seconds' | 'distance')[] = []
  if (type === 'reps_weight') {
    if ((set.weight ?? 0) > before.maxWeight && before.maxWeight > 0) out.push('weight')
    else if (e1rm(set.reps, set.weight) > before.bestE1rm && before.bestE1rm > 0) out.push('e1rm')
  } else if (type === 'reps') {
    if ((set.reps ?? 0) > before.maxReps && before.maxReps > 0) out.push('reps')
  } else if (type === 'time') {
    if ((set.seconds ?? 0) > before.maxSeconds && before.maxSeconds > 0) out.push('seconds')
  } else if ((set.distance ?? 0) > before.maxDistance && before.maxDistance > 0) out.push('distance')
  return out
}

/** Index of the set within each exercise that holds a new record (the best one only), for badges. */
export function recordSets(w: Workout, stats: Record<string, ExerciseStats> | undefined): Set<string> {
  const marks = new Set<string>()
  if (!stats) return marks
  w.exercises.forEach((ex, i) => {
    const before = stats[ex.exerciseId]?.records
    let best = -1
    let bestScore = 0
    ex.sets.forEach((s, j) => {
      if (!setRecords(s, ex.trackingType, before).length) return
      const score = ex.trackingType === 'reps_weight' ? e1rm(s.reps, s.weight) + (s.weight ?? 0) / 1000 : (s.reps ?? 0) + (s.seconds ?? 0) + (s.distance ?? 0)
      if (score > bestScore) {
        bestScore = score
        best = j
      }
    })
    if (best >= 0) marks.add(`${i}:${best}`)
  })
  return marks
}

/** The list with item `i` moved by `delta` places (unchanged at the ends). */
export function moveItem<T>(list: T[], i: number, delta: number): T[] {
  const j = i + delta
  if (j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j] as T, next[i] as T]
  return next
}

const hasValue = (s: SetValues, type: TrackingType) =>
  type === 'reps_weight' ? s.reps != null || s.weight != null : type === 'reps' ? s.reps != null : type === 'time' ? s.seconds != null : s.distance != null || s.seconds != null

/** The values a ✓ on an empty row should take: what was done last time. */
export function fillFrom(s: SetValues, prev: SetValues | undefined, type: TrackingType): Partial<SetValues> | null {
  if (!prev || hasValue(s, type)) return null
  return { reps: prev.reps ?? null, weight: prev.weight ?? null, seconds: prev.seconds ?? null, distance: prev.distance ?? null }
}
