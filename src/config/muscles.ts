/** free-exercise-db muscle keys, ordered top to bottom of the body. Display names are in the locales (`muscle.<key>`). */
export const MUSCLES = [
  'chest',
  'shoulders',
  'triceps',
  'biceps',
  'forearms',
  'traps',
  'lats',
  'middle back',
  'lower back',
  'neck',
  'abdominals',
  'glutes',
  'quadriceps',
  'hamstrings',
  'adductors',
  'abductors',
  'calves',
] as const

export type Muscle = (typeof MUSCLES)[number]

export const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'kettlebells', 'body only', 'bands', 'e-z curl bar', 'medicine ball', 'exercise ball', 'foam roll', 'other'] as const

export const LEVELS = ['beginner', 'intermediate', 'expert'] as const

export const CATEGORIES = ['strength', 'powerlifting', 'olympic weightlifting', 'strongman', 'plyometrics', 'cardio', 'stretching'] as const

export const TRACKING_TYPES = ['reps_weight', 'reps', 'time', 'distance_time'] as const

/** Locale key segment for a stored value: 'middle back' → 'middle_back'. */
export const keyOf = (value: string) => value.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
