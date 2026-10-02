import { useEffect, useState } from 'react'
import { type ApiError, apiFetch, toApiError } from './api'
import type { CustomExercise, CustomExerciseInput, ExerciseStats, HistorySession, Records, Stats, Template, Workout } from './types'

// Tiny stale-while-revalidate layer: the last response of every GET path is kept in memory, shown
// at once on the next visit and refreshed in the background. Writes call `invalidate(prefix)` so
// every mounted hook reading a path under that prefix reloads.
const cache = new Map<string, unknown>()
const listeners = new Set<(prefix: string) => void>()

export function invalidate(...prefixes: string[]) {
  for (const p of prefixes) {
    for (const key of cache.keys()) if (key.startsWith(p)) cache.delete(key)
    for (const l of listeners) l(p)
  }
}

export interface Resource<T> {
  data: T | undefined
  loading: boolean
  error: ApiError | null
  reload: () => void
}

/** GET `path` (null = nothing to load) and return `body[field]` (the whole body when `field` is ''). */
export function useApi<T>(path: string | null, field: string): Resource<T> {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: T; error?: ApiError } | null>(null)
  const key = `${path}#${version}`

  useEffect(() => {
    if (!path) return
    const onInvalidate = (prefix: string) => {
      if (path.startsWith(prefix)) setVersion((v) => v + 1)
    }
    listeners.add(onInvalidate)
    return () => {
      listeners.delete(onInvalidate)
    }
  }, [path])

  useEffect(() => {
    if (!path) return
    let alive = true
    apiFetch<Record<string, unknown>>(path).then(
      (body) => {
        const data = (field ? body[field] : body) as T
        cache.set(path, data)
        if (alive) setResult({ key, data })
      },
      (e: unknown) => {
        if (alive) setResult({ key, error: toApiError(e) })
      },
    )
    return () => {
      alive = false
    }
  }, [path, field, key])

  const fresh = result?.key === key
  return {
    data: (fresh ? result.data : undefined) ?? (path ? (cache.get(path) as T | undefined) : undefined),
    loading: !!path && !fresh,
    error: fresh ? (result.error ?? null) : null,
    reload: () => setVersion((v) => v + 1),
  }
}

const put = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const del = (path: string) => apiFetch<void>(path, { method: 'DELETE' })

// --- templates ---------------------------------------------------------------------------------

export const useTemplates = () => useApi<Template[]>('/templates', 'templates')

export async function saveTemplate({ id, ...t }: Template) {
  await put(`/templates/${id}`, t)
  invalidate('/templates')
}
export async function deleteTemplate(id: string) {
  await del(`/templates/${id}`)
  invalidate('/templates')
}

// --- workouts -----------------------------------------------------------------------------------

export const useWorkouts = (q: { from?: string; to?: string; status?: 'active' | 'done'; limit?: number } = {}) => {
  const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
  return useApi<Workout[]>(`/workouts?${params}`, 'workouts')
}
export const useWorkout = (id: string | undefined) => useApi<Workout>(id ? `/workouts/${id}` : null, 'workout')

/** Saves without invalidating (the live screen autosaves often); call `workoutsChanged()` when done. */
export const putWorkout = ({ id, totalSets: _s, totalReps: _r, volumeKg: _v, ...w }: Workout, init: RequestInit = {}) =>
  apiFetch<{ workout: Workout }>(`/workouts/${id}`, { ...init, method: 'PUT', body: JSON.stringify(w) })

export const workoutsChanged = () => invalidate('/workouts', '/stats', '/exercise-stats', '/exercise-history')

export async function saveWorkout(w: Workout) {
  await putWorkout(w)
  workoutsChanged()
}
export async function deleteWorkout(id: string) {
  await del(`/workouts/${id}`)
  workoutsChanged()
}

// --- statistics ---------------------------------------------------------------------------------

export const useStats = (from: string, to: string) => useApi<Stats>(`/stats?from=${from}&to=${to}`, '')

/** Previous sets and records per exercise, leaving out the workout being viewed or logged. */
export function useExerciseStats(ids: string[], exclude?: string) {
  const unique = [...new Set(ids)].sort().slice(0, 50)
  const path = unique.length ? `/exercise-stats?ids=${encodeURIComponent(unique.join(','))}${exclude ? `&exclude=${exclude}` : ''}` : null
  return useApi<Record<string, ExerciseStats>>(path, 'stats')
}

export const useExerciseHistory = (id: string, limit = 30) =>
  useApi<{ sessions: HistorySession[]; records: Records }>(`/exercise-history/${encodeURIComponent(id)}?limit=${limit}`, '')

// --- custom exercises ---------------------------------------------------------------------------

export const useCustomExercises = () => useApi<CustomExercise[]>('/exercises', 'exercises')

export async function saveCustomExercise(id: string, e: CustomExerciseInput) {
  await put(`/exercises/${id}`, e)
  invalidate('/exercises')
}
export async function deleteCustomExercise(id: string) {
  await del(`/exercises/${id}`)
  invalidate('/exercises')
}
