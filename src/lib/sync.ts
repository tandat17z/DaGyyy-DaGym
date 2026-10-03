import { apiFetch } from './api'
import { clearLocal, localData, localKey, writeList } from './localApi'
import type { CustomExercise, Program, Template, Workout } from './types'

// Moving data between this browser and the server when the account's storage changes
// (same flow as DaFinance): approved → upload the browser data; revoked → copy the server data here.

const WORKOUT_CHUNK = 50

/** What this browser holds for `email` (shown before moving it to the server). */
export function localCounts(email: string) {
  const d = localData(email)
  return { programs: d.programs.length, days: d.templates.length, workouts: d.workouts.length, exercises: d.exercises.length }
}

/** Read-only fields the API computes; it rejects unknown keys. */
const strip = <T extends object>(doc: T) => {
  const { updatedAt: _u, totalSets: _s, totalReps: _r, volumeKg: _v, ...rest } = doc as T & { updatedAt?: unknown; totalSets?: unknown; totalReps?: unknown; volumeKg?: unknown }
  return rest
}

/**
 * Server storage was granted: upload this browser's data with the import endpoint (upsert by id,
 * so retrying is safe), then clear it — only after every request succeeded.
 */
export async function pushLocalToServer(email: string) {
  const d = localData(email)
  await apiFetch('/import', { method: 'POST', body: JSON.stringify({ programs: d.programs.map(strip), templates: d.templates.map(strip), exercises: d.exercises.map(strip), workouts: [] }) })
  for (let i = 0; i < d.workouts.length; i += WORKOUT_CHUNK) {
    const workouts = d.workouts.slice(i, i + WORKOUT_CHUNK).map(strip)
    await apiFetch('/import', { method: 'POST', body: JSON.stringify({ programs: [], templates: [], exercises: [], workouts }) })
  }
  clearLocal(email)
}

/**
 * Server storage was revoked (the server keeps the data, read-only): copy it into this browser once,
 * so the user carries on locally. Returns false when it was already copied.
 */
export async function pullServerToLocal(email: string) {
  const flag = localKey(email, 'pulled')
  try {
    if (localStorage.getItem(flag)) return false
  } catch {
    return false
  }
  const [programs, templates, exercises, workouts] = await Promise.all([
    apiFetch<{ programs: Program[] }>('/programs'),
    apiFetch<{ templates: Template[] }>('/templates'),
    apiFetch<{ exercises: CustomExercise[] }>('/exercises'),
    apiFetch<{ workouts: Workout[] }>('/workouts?limit=500'),
  ])
  writeList(localKey(email, 'programs'), programs.programs)
  writeList(localKey(email, 'templates'), templates.templates)
  writeList(localKey(email, 'exercises'), exercises.exercises)
  writeList(localKey(email, 'workouts'), workouts.workouts)
  try {
    localStorage.setItem(flag, new Date().toISOString())
  } catch {
    // Not remembered: the next visit copies again (it overwrites, so nothing is duplicated).
  }
  return true
}
