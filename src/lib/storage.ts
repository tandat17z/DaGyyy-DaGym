import { useEffect, useState } from 'react'
import { type ApiError, apiFetch, toApiError } from './api'
import { localRequest } from './localApi'
import type { CustomExercise, CustomExerciseInput, ExerciseStats, HistorySession, Program, Records, Stats, Template, Workout } from './types'

/**
 * Where the data lives: the central API, or this browser (users without server storage, and the
 * standalone build; see lib/localApi.ts). Both answer the same `/v1/gym` paths. The account gate
 * (components/AccountGate.tsx) picks one with `selectStore()` before anything renders.
 */
export interface GymStore {
  kind: 'server' | 'browser'
  /** Email the browser data belongs to ('' for the server). */
  owner: string
  request: <T>(path: string, init?: RequestInit) => Promise<T>
}

export const serverStore: GymStore = { kind: 'server', owner: '', request: apiFetch }
export const localStore = (owner: string): GymStore => ({ kind: 'browser', owner, request: (path, init) => localRequest(owner, path, init) })

let store: GymStore = serverStore

/** Switches the store; cached responses of the previous one are dropped. */
export function selectStore(next: GymStore) {
  if (store !== next) {
    store = next
    cache.clear()
  }
}

const request = <T>(path: string, init?: RequestInit) => store.request<T>(path, init)

/** Identifies the current store, e.g. to keep per-store state apart in localStorage. */
export const storeId = () => (store.kind === 'server' ? 'server' : `u.${store.owner.toLowerCase()}`)

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
    request<Record<string, unknown>>(path).then(
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

const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const del = (path: string) => request<void>(path, { method: 'DELETE' })

// --- programs & templates (workout days) --------------------------------------------------------------------------

export const usePrograms = () => useApi<Program[]>('/programs', 'programs')
export const useTemplates = () => useApi<Template[]>('/templates', 'templates')

export async function saveProgram({ id, updatedAt: _u, ...p }: Program & { updatedAt?: string }) {
  await put(`/programs/${id}`, p)
  invalidate('/programs')
}
/** Also deletes its workout days; logged workouts stay. */
export async function deleteProgram(id: string) {
  await del(`/programs/${id}`)
  invalidate('/programs', '/templates')
}

export async function saveTemplate({ id, updatedAt: _u, ...t }: Template & { updatedAt?: string }) {
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

/** Saves without invalidating (the live screen autosaves often); call `workoutsChanged()` when done. Read-only fields are left out (the API rejects unknown keys). */
export const putWorkout = ({ id, totalSets: _s, totalReps: _r, volumeKg: _v, updatedAt: _u, ...w }: Workout & { updatedAt?: string }, init: RequestInit = {}) =>
  request<{ workout: Workout }>(`/workouts/${id}`, { ...init, method: 'PUT', body: JSON.stringify(w) })

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
