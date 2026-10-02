import type { PlanItem, SetValues, Template, TrackingType, Workout } from './types'

// Progress of workouts and templates. There is no fixed schedule: a template is a "workout day"
// of the programme, and the calendar only shows what was actually trained.

/** One exercise of a day, from a template (targets only) or from the live workout (with ✓). */
export interface DayItem {
  exerciseId: string
  name: string
  trackingType: TrackingType
  restSec: number
  note: string
  sets: (SetValues & { done?: boolean })[]
}

export const itemsOfTemplate = (tpl: Template, typeOf: (id: string) => TrackingType | undefined, nameOf: (id: string) => string | undefined): DayItem[] =>
  tpl.items.map((it) => ({
    exerciseId: it.exerciseId,
    name: nameOf(it.exerciseId) ?? it.exerciseId,
    trackingType: it.trackingType ?? typeOf(it.exerciseId) ?? 'reps_weight',
    restSec: it.restSec,
    note: it.note,
    sets: it.sets,
  }))

/** Completed sets / all sets, 0…1. */
export function itemProgress(item: Pick<DayItem, 'sets'>): number {
  if (!item.sets.length) return 0
  return item.sets.filter((s) => s.done).length / item.sets.length
}

export function workoutProgress(w: Pick<Workout, 'exercises'>): number {
  const all = w.exercises.reduce((n, e) => n + e.sets.length, 0)
  if (!all) return 0
  return w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0) / all
}

export const percent = (p: number) => Math.round(p * 100)

/** The latest workout of each template (`workouts` newest first). */
export function lastByTemplate(workouts: Workout[]): Map<string, Workout> {
  const out = new Map<string, Workout>()
  for (const w of workouts) if (w.templateId && !out.has(w.templateId)) out.set(w.templateId, w)
  return out
}

/** The template after the one trained most recently (programme order, wrapping round), else the first. */
export function nextTemplate(templates: Template[], workouts: Workout[]): Template | undefined {
  const last = workouts.find((w) => w.templateId && templates.some((t) => t.id === w.templateId))
  if (!last) return templates[0]
  const i = templates.findIndex((t) => t.id === last.templateId)
  return templates[(i + 1) % templates.length]
}

/** Rough duration of a plan in seconds: work + rest after every set + a minute to set up each exercise. */
export function estimateSec(items: Pick<DayItem, 'trackingType' | 'restSec' | 'sets'>[]): number {
  return items.reduce((total, it) => {
    const work = it.sets.reduce((n, s) => n + (it.trackingType === 'time' || it.trackingType === 'distance_time' ? (s.seconds ?? 60) : 40), 0)
    return total + 60 + work + it.sets.length * it.restSec
  }, 0)
}

/** The set to log next: the first one not done (null when all are done). */
export function nextSetIndex(item: Pick<DayItem, 'sets'>): number | null {
  const i = item.sets.findIndex((s) => !s.done)
  return i < 0 ? null : i
}
