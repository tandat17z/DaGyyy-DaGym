import { useState } from 'react'
import { usePrograms, useTemplates, useWorkouts } from './storage'
import type { Program, Template } from './types'

// The program shown on the dashboard. Chosen by the user (kept on this device); until then the
// program of the latest workout, else the first one.

const KEY = 'dagym.program'

function readChoice(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** Workout days of a program, in order. */
export const daysOf = (templates: Template[] | undefined, programId: string | null | undefined) =>
  (templates ?? []).filter((t) => (t.programId ?? null) === (programId ?? null)).sort((a, b) => a.position - b.position)

export function useCurrentProgram() {
  const programs = usePrograms()
  const templates = useTemplates()
  const recent = useWorkouts({ status: 'done', limit: 500 })
  const [choice, setChoice] = useState(readChoice)
  const list = programs.data ?? []
  const byTemplate = new Map((templates.data ?? []).map((t) => [t.id, t.programId]))
  const latest = (recent.data ?? []).map((w) => (w.templateId ? byTemplate.get(w.templateId) : null)).find(Boolean)
  const current: Program | undefined = list.find((p) => p.id === choice) ?? list.find((p) => p.id === latest) ?? list[0]

  const setCurrent = (id: string) => {
    setChoice(id)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      // Not remembered; still used until the page closes.
    }
  }
  return { programs, templates, current, days: daysOf(templates.data, current?.id), setCurrent }
}
