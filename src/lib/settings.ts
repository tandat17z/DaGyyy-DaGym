import { applyTheme, isTheme, type Theme } from '@tada/kit/theme'
import { useSyncExternalStore } from 'react'

// User settings (current program, theme), one small JSON document kept in this browser (`dagym.settings`). When the data lives
// on the server, components/SettingsSync.tsx mirrors it to `/v1/gym/settings` so it follows the user.

export interface Settings {
  /** Program shown on the dashboard (null: the program of the latest workout). */
  program: string | null
  theme: Theme
}

const KEY = 'dagym.settings'
/** Before settings existed, the current program had its own key. */
const LEGACY_PROGRAM_KEY = 'dagym.program'

export function withDefaults(raw: Partial<Settings> | null | undefined): Settings {
  return { program: typeof raw?.program === 'string' ? raw.program : null, theme: isTheme(raw?.theme) ? raw.theme : 'dark' }
}

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return withDefaults(JSON.parse(raw) as Partial<Settings>)
    return withDefaults({ program: localStorage.getItem(LEGACY_PROGRAM_KEY) })
  } catch {
    return withDefaults(null)
  }
}

let current = read()
// As early as possible, so the page does not flash the wrong theme.
applyTheme(current.theme)
const listeners = new Set<() => void>()

/** Applies `fn` to the settings, saves them in this browser and notifies every reader. */
export function updateSettings(fn: (s: Settings) => Settings) {
  const next = fn(current)
  if (JSON.stringify(next) === JSON.stringify(current)) return
  current = next
  applyTheme(next.theme)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Kept in memory until the page closes.
  }
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useSettings = () => useSyncExternalStore(subscribe, () => current)
