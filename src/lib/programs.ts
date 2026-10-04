import { usePrograms, useTemplates, useWorkouts } from './storage'
import { updateSettings, useSettings } from './settings'
import type { Program, Template } from './types'

// The program shown on the dashboard. Chosen by the user (a setting: this browser, synced to the
// server when the data lives there); until then the program of the latest workout, else the first one.

/** Workout days of a program, in order. */
export const daysOf = (templates: Template[] | undefined, programId: string | null | undefined) =>
  (templates ?? []).filter((t) => (t.programId ?? null) === (programId ?? null)).sort((a, b) => a.position - b.position)

export function useCurrentProgram() {
  const programs = usePrograms()
  const templates = useTemplates()
  const recent = useWorkouts({ status: 'done', limit: 500 })
  const choice = useSettings().program
  const list = programs.data ?? []
  const byTemplate = new Map((templates.data ?? []).map((t) => [t.id, t.programId]))
  const latest = (recent.data ?? []).map((w) => (w.templateId ? byTemplate.get(w.templateId) : null)).find(Boolean)
  const current: Program | undefined = list.find((p) => p.id === choice) ?? list.find((p) => p.id === latest) ?? list[0]

  const setCurrent = (id: string) => updateSettings((s) => ({ ...s, program: id }))
  return { programs, templates, current, days: daysOf(templates.data, current?.id), setCurrent }
}
