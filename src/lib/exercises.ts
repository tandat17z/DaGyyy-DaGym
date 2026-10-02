import { createContext, useContext } from 'react'
import type { ApiError } from './api'
import type { CustomExercise, Exercise } from './types'

// The free-exercise-db catalog ships as a static file (public/data/exercises.json, built by
// scripts/build-exercises.mjs) and is fetched once. Custom exercises come from the API. Both are
// merged into one list for the whole app through <ExercisesProvider>.

export interface ExercisesValue {
  /** Custom exercises first, then the catalog (alphabetical). */
  list: Exercise[]
  byId: Map<string, Exercise>
  custom: CustomExercise[]
  loading: boolean
  catalogError: boolean
  customError: ApiError | null
}

export const ExercisesContext = createContext<ExercisesValue | null>(null)

export function useExercises(): ExercisesValue {
  const v = useContext(ExercisesContext)
  if (!v) throw new Error('useExercises must be used inside <ExercisesProvider>')
  return v
}

/** Lower-case, accent-free text for search ("Đẩy ngực" matches "day nguc"). */
export const searchable = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
