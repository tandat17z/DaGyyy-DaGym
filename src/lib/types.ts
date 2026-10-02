// Mirrors the contract of the central API (`../api/src/apps/gym`). Never import from that repo.

/** How a set is logged: reps × kg, reps only, seconds, or distance (km) + time. */
export type TrackingType = 'reps_weight' | 'reps' | 'time' | 'distance_time'

/** Catalog (free-exercise-db) or custom exercise, in one shape for the UI. */
export interface Exercise {
  id: string
  /** In the current language when a translation exists. */
  name: string
  /** The name in the other language (searched too). */
  altName: string
  category: string
  equipment: string | null
  level: string | null
  force: string | null
  mechanic: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  /** Absolute image URLs (catalog: start + end position). */
  images: string[]
  trackingType: TrackingType
  custom: boolean
}

export interface CustomExerciseInput {
  name: string
  category: string
  trackingType: TrackingType
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string | null
  imageUrl: string | null
  instructions: string[]
}
export interface CustomExercise extends CustomExerciseInput {
  id: string
}

/** Values of one set; which fields matter depends on the tracking type. `seconds` is the duration. */
export interface SetValues {
  reps?: number | null
  weight?: number | null
  seconds?: number | null
  distance?: number | null
}

/** One exercise of a template or a custom day plan; `sets` are targets. */
export interface PlanItem {
  exerciseId: string
  trackingType?: TrackingType
  restSec: number
  note: string
  sets: SetValues[]
}

export type ColorKey = 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8'

export interface Template {
  id: string
  name: string
  note: string
  color: ColorKey
  items: PlanItem[]
  position: number
}

export interface LoggedSet extends SetValues {
  done: boolean
}

export interface LoggedExercise {
  exerciseId: string
  /** Snapshot, so history survives catalog changes and deleted custom exercises. */
  name: string
  muscle: string
  trackingType: TrackingType
  restSec: number
  note: string
  sets: LoggedSet[]
}

export interface Workout {
  id: string
  date: string
  name: string
  templateId: string | null
  status: 'active' | 'done'
  startedAt: string
  finishedAt: string | null
  durationSec: number
  note: string
  exercises: LoggedExercise[]
  /** Computed by the API over completed sets. */
  totalSets?: number
  totalReps?: number
  volumeKg?: number
}

export interface Records {
  maxWeight: number
  bestE1rm: number
  maxReps: number
  maxSeconds: number
  maxDistance: number
  maxSetVolume: number
}

export interface ExerciseStats {
  last: { workoutId: string; date: string; sets: SetValues[] } | null
  records: Records
}

export interface StatsDay {
  date: string
  workouts: number
  durationSec: number
  sets: number
  reps: number
  volumeKg: number
}

export interface Stats {
  range: { from: string; to: string }
  totals: Omit<StatsDay, 'date'>
  byDay: StatsDay[]
  byMuscle: { muscle: string; sets: number }[]
  byExercise: { exerciseId: string; sets: number; volumeKg: number; workouts: number }[]
}

export interface HistorySession {
  workoutId: string
  date: string
  sets: SetValues[]
  records: Records
}
