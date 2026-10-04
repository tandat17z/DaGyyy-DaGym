import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { type Settings, updateSettings, useSettings, withDefaults } from '../lib/settings'

/**
 * Keeps settings (current program…) on the server when data lives there, so they follow the user
 * across browsers and the installed app. The server copy wins on load; the first time (none stored
 * yet) this browser's settings are uploaded. Renders nothing; browser-only users are untouched.
 */
export function SettingsSync() {
  const settings = useSettings()
  const [ready, setReady] = useState(false)
  // JSON of what the server holds, to skip writing back what was just read.
  const saved = useRef('')

  useEffect(() => {
    let off = false
    apiFetch<{ settings: Partial<Settings> | null }>('/settings')
      .then(({ settings: remote }) => {
        if (off) return
        if (remote) {
          const next = withDefaults(remote)
          saved.current = JSON.stringify(next)
          updateSettings(() => next)
        }
        setReady(true)
      })
      // Unreachable or not supported yet: keep this browser's settings and don't write.
      .catch(() => {})
    return () => {
      off = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const json = JSON.stringify(settings)
    if (json === saved.current) return
    const id = setTimeout(() => {
      apiFetch('/settings', { method: 'PUT', body: json })
        .then(() => {
          saved.current = json
        })
        .catch(() => {
          // Kept in this browser; the next change tries again.
        })
    }, 800)
    return () => clearTimeout(id)
  }, [settings, ready])

  return null
}
