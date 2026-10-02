import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toApiError } from '../lib/api'
import { SessionContext, type SessionValue, type Stored, type SyncState } from '../lib/session'
import { beep, unlockAudio } from '../lib/sound'
import { deleteWorkout, putWorkout, workoutsChanged } from '../lib/storage'
import type { Workout } from '../lib/types'

const STORAGE_KEY = 'dagym.session'
const SYNC_DELAY_MS = 3000

function read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as Stored
      if (s.workout?.status === 'active') return { workout: s.workout, rest: s.rest ?? null, setTimer: s.setTimer ?? null }
    }
  } catch {
    // Blocked or corrupt storage: start empty.
  }
  return { workout: null, rest: null, setTimer: null }
}

function write(s: Stored) {
  try {
    if (s.workout) localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Not persisted; the session still works until the tab closes.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(read)
  const [sync, setSync] = useState<SyncState>('saved')
  const latest = useRef(state.workout)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef<Promise<unknown> | null>(null)

  const commit = useCallback((next: Stored) => {
    write(next)
    setState(next)
  }, [])

  // Persist to the API: one request at a time, always the newest version.
  const push = useCallback(async (keepalive = false) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const w = latest.current
    if (!w) return
    await inFlight.current?.catch(() => {})
    // Changed while waiting for the previous request: send the newest version instead.
    const send = keepalive ? w : (latest.current ?? w)
    setSync('saving')
    const req = putWorkout(send, { keepalive })
    inFlight.current = req
    try {
      await req
      setSync(latest.current === send ? 'saved' : 'pending')
    } catch (e) {
      setSync('error')
      throw toApiError(e)
    } finally {
      if (inFlight.current === req) inFlight.current = null
    }
  }, [])

  const schedule = useCallback(() => {
    setSync('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void push().catch(() => {}), SYNC_DELAY_MS)
  }, [push])

  // Flush when the tab is hidden (phone locked, app switched) and retry when back online.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && timer.current) void push(true).catch(() => {})
    }
    const onOnline = () => {
      if (latest.current) void push().catch(() => {})
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('online', onOnline)
    }
  }, [push])

  // Always the newest state: every change goes through `set`, which updates it synchronously.
  const stateRef = useRef(state)
  const set = useCallback(
    (patch: Partial<Stored>, changedWorkout = false) => {
      const next = { ...stateRef.current, ...patch }
      stateRef.current = next
      latest.current = next.workout
      commit(next)
      if (changedWorkout && next.workout) schedule()
    },
    [commit, schedule],
  )

  const value = useMemo<SessionValue>(() => {
    const startRest = (sec: number, exercise: number) => {
      if (sec > 0) set({ rest: { endsAt: Date.now() + sec * 1000, totalSec: sec, exercise } })
    }
    const update = (fn: (w: Workout) => Workout) => {
      const w = stateRef.current.workout
      if (w) set({ workout: fn(w) }, true)
    }
    const completeSet = (w: Workout, exercise: number, setIndex: number, patch: Partial<Workout['exercises'][number]['sets'][number]>) => ({
      ...w,
      exercises: w.exercises.map((ex, i) => (i !== exercise ? ex : { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) })),
    })
    return {
      ...state,
      sync,
      start: (w) => {
        set({ workout: w, rest: null, setTimer: null }, true)
      },
      update,
      toggleSet: (exercise, setIndex) => {
        const w = stateRef.current.workout
        const ex = w?.exercises[exercise]
        const s = ex?.sets[setIndex]
        if (!w || !ex || !s) return
        unlockAudio()
        const done = !s.done
        const next = completeSet(w, exercise, setIndex, { done })
        set({ workout: next, ...(done ? {} : { rest: null }) }, true)
        if (done) startRest(ex.restSec, exercise)
      },
      startRest,
      adjustRest: (delta) => {
        const r = stateRef.current.rest
        if (!r) return
        const endsAt = Math.max(Date.now(), r.endsAt + delta * 1000)
        set({ rest: { ...r, endsAt, totalSec: Math.max(1, r.totalSec + delta) } })
      },
      skipRest: () => set({ rest: null }),
      startSetTimer: (exercise, setIndex) => {
        const target = stateRef.current.workout?.exercises[exercise]?.sets[setIndex]?.seconds ?? null
        unlockAudio()
        set({ setTimer: { exercise, set: setIndex, startedAt: Date.now(), targetSec: target && target > 0 ? target : null }, rest: null })
      },
      stopSetTimer: () => {
        const { workout: w, setTimer: t } = stateRef.current
        if (!w || !t) return
        const elapsed = Math.round((Date.now() - t.startedAt) / 1000)
        const seconds = t.targetSec ? Math.min(elapsed, t.targetSec) : elapsed
        set({ workout: completeSet(w, t.exercise, t.set, { seconds, done: true }), setTimer: null }, true)
        startRest(w.exercises[t.exercise]?.restSec ?? 0, t.exercise)
      },
      cancelSetTimer: () => set({ setTimer: null }),
      finish: async () => {
        const w = stateRef.current.workout
        if (!w) throw new Error('No active workout')
        const finishedAt = new Date()
        const done: Workout = {
          ...w,
          status: 'done',
          finishedAt: finishedAt.toISOString(),
          durationSec: Math.max(0, Math.round((finishedAt.getTime() - new Date(w.startedAt).getTime()) / 1000)),
        }
        latest.current = done
        await push()
        set({ workout: null, rest: null, setTimer: null })
        workoutsChanged()
        return done
      },
      discard: async () => {
        const w = stateRef.current.workout
        if (timer.current) clearTimeout(timer.current)
        timer.current = null
        await inFlight.current?.catch(() => {})
        if (w) await deleteWorkout(w.id).catch(() => {}) // never saved yet → 404, fine
        set({ workout: null, rest: null, setTimer: null })
        setSync('saved')
      },
    }
  }, [state, sync, set, push])

  // Alarm when the rest is over; the bar then shows "time's up" briefly and closes.
  const restEndsAt = state.rest?.endsAt
  useEffect(() => {
    if (!restEndsAt) return
    const ring = setTimeout(() => beep(), Math.max(0, restEndsAt - Date.now()))
    const close = setTimeout(() => {
      if (stateRef.current.rest?.endsAt === restEndsAt) set({ rest: null })
    }, Math.max(0, restEndsAt - Date.now()) + 6000)
    return () => {
      clearTimeout(ring)
      clearTimeout(close)
    }
  }, [restEndsAt, set])

  // A counting-down set timer completes the set by itself.
  const setTimer = state.setTimer
  useEffect(() => {
    if (!setTimer?.targetSec) return
    const ms = setTimer.startedAt + setTimer.targetSec * 1000 - Date.now()
    const id = setTimeout(() => {
      beep(2)
      value.stopSetTimer()
    }, Math.max(0, ms))
    return () => clearTimeout(id)
  }, [setTimer, value])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
