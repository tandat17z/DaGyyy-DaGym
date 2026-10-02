import { createContext, useContext, useEffect, useState } from 'react'
import type { Workout } from './types'

// The workout being logged right now. It lives in this provider (not in a page) so the rest timer
// keeps running while browsing the dictionary, and in localStorage so a reload, a locked phone or
// a closed tab loses nothing. Timers are stored as timestamps, never as ticking counters.
// Every change is also pushed to the API (debounced PUT), so the workout can be resumed elsewhere.

export interface RestTimer {
  endsAt: number
  totalSec: number
  /** Exercise the rest follows (index in workout.exercises). */
  exercise: number
}

/** Stopwatch of a timed set; counts down when the set has a target. */
export interface SetTimer {
  exercise: number
  set: number
  startedAt: number
  targetSec: number | null
}

export interface Stored {
  workout: Workout | null
  rest: RestTimer | null
  setTimer: SetTimer | null
}

export type SyncState = 'saved' | 'pending' | 'saving' | 'error'

export interface SessionValue extends Stored {
  sync: SyncState
  start: (w: Workout) => void
  update: (fn: (w: Workout) => Workout) => void
  /** Marks a set done / not done; done starts the rest timer of that exercise. */
  toggleSet: (exercise: number, set: number) => void
  startRest: (sec: number, exercise: number) => void
  adjustRest: (deltaSec: number) => void
  skipRest: () => void
  startSetTimer: (exercise: number, set: number) => void
  /** Stops the set stopwatch, writes the seconds and completes the set. */
  stopSetTimer: () => void
  cancelSetTimer: () => void
  finish: () => Promise<Workout>
  discard: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const v = useContext(SessionContext)
  if (!v) throw new Error('useSession must be used inside <SessionProvider>')
  return v
}

/** Current time, re-rendered every `ms` while `active`. */
export function useNow(active: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return now
}

/** Keeps the screen on while `active` (Screen Wake Lock API; silently unavailable elsewhere). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let alive = true
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen')
        if (!alive) void lock?.release()
      } catch {
        // Denied (battery saver, iframe…): ignore.
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
