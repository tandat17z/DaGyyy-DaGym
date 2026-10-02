import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ExercisesContext, type ExercisesValue } from '../lib/exercises'
import { useCustomExercises } from '../lib/storage'
import { useI18n } from '../locales'
import type { CustomExercise, Exercise, TrackingType } from '../lib/types'

interface RawCatalog {
  imageBase: string
  exercises: { id: string; n: string; c: string; q: string | null; l: string | null; f: string | null; m: string | null; p: string[]; s: string[]; i: string[]; img: string[]; t: TrackingType; nv?: string; iv?: string[] }[]
}

type CatalogEntry = Exercise & { nameVi?: string; instructionsVi?: string[] }
let catalogPromise: Promise<CatalogEntry[]> | null = null
function loadCatalog(): Promise<CatalogEntry[]> {
  catalogPromise ??= fetch('/data/exercises.json')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<RawCatalog>
    })
    .then(({ imageBase, exercises }) =>
      exercises.map((e) => ({
        id: e.id,
        name: e.n,
        altName: '',
        nameVi: e.nv,
        instructionsVi: e.iv,
        category: e.c,
        equipment: e.q,
        level: e.l,
        force: e.f,
        mechanic: e.m,
        primaryMuscles: e.p,
        secondaryMuscles: e.s,
        instructions: e.i,
        images: e.img.map((p) => imageBase + p),
        trackingType: e.t,
        custom: false,
      })),
    )
    .catch((e: unknown) => {
      catalogPromise = null // allow a retry on the next mount
      throw e
    })
  return catalogPromise
}

const fromCustom = (c: CustomExercise): Exercise => ({
  id: c.id,
  name: c.name,
  altName: '',
  category: c.category,
  equipment: c.equipment,
  level: null,
  force: null,
  mechanic: null,
  primaryMuscles: c.primaryMuscles,
  secondaryMuscles: c.secondaryMuscles,
  instructions: c.instructions,
  images: c.imageUrl ? [c.imageUrl] : [],
  trackingType: c.trackingType,
  custom: true,
})

export function ExercisesProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n()
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null)
  const [catalogError, setCatalogError] = useState(false)
  const custom = useCustomExercises()

  useEffect(() => {
    let alive = true
    loadCatalog().then(
      (list) => alive && setCatalog(list),
      () => alive && setCatalogError(true),
    )
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo<ExercisesValue>(() => {
    const customList = custom.data ?? []
    // Vietnamese: translated name / steps, English name kept for search (and vice versa).
    const localized = (catalog ?? []).map(({ nameVi, instructionsVi, ...e }): Exercise =>
      locale === 'vi' && nameVi ? { ...e, name: nameVi, altName: e.name, instructions: instructionsVi ?? e.instructions } : { ...e, altName: nameVi ?? '' },
    )
    const list = [...customList.map(fromCustom), ...localized]
    return {
      list,
      byId: new Map(list.map((e) => [e.id, e])),
      custom: customList,
      loading: !catalog && !catalogError,
      catalogError,
      customError: custom.error,
    }
  }, [catalog, catalogError, custom.data, custom.error, locale])

  return <ExercisesContext.Provider value={value}>{children}</ExercisesContext.Provider>
}
