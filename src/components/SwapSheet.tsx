import { useMemo, useState } from 'react'
import { useFormat } from '../lib/format'
import { searchable, useExercises } from '../lib/exercises'
import type { Exercise } from '../lib/types'
import { useI18n } from '../locales'
import { ExerciseImage } from './ExerciseImage'
import { IconSearch } from './icons'
import { Button, Chip, Sheet } from './ui'

const PAGE = 40

/**
 * Exercises similar to `current`: same main muscle (or any of its muscles), same equipment first.
 * For a busy machine or a variation; `onPick` swaps it in.
 */
export function SwapSheet({ open, onClose, current, onPick, hint }: { open: boolean; onClose: () => void; current: Exercise | undefined; onPick: (e: Exercise) => void; hint?: string }) {
  const { t } = useI18n()
  const { muscleName, equipmentName } = useFormat()
  const { list } = useExercises()
  const muscles = current ? [...current.primaryMuscles, ...current.secondaryMuscles] : []
  const [muscle, setMuscle] = useState<string | null>(current?.primaryMuscles[0] ?? null)
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const matches = useMemo(() => {
    if (!current) return []
    const needle = searchable(q.trim())
    const score = (e: Exercise) =>
      (e.primaryMuscles[0] === current.primaryMuscles[0] ? 4 : 0) + (e.equipment === current.equipment ? 2 : 0) + (e.category === current.category ? 1 : 0) + (e.custom ? 1 : 0)
    return list
      .filter((e) => e.id !== current.id && (!muscle || e.primaryMuscles.includes(muscle)) && (!needle || searchable(e.name).includes(needle) || searchable(e.altName).includes(needle)))
      .sort((a, b) => score(b) - score(a))
  }, [list, current, muscle, q])

  return (
    <Sheet open={open} onClose={onClose} title={t('swap.title')} tall>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {hint && <p className="text-xs text-subtle">{hint}</p>}
        <label className="relative block">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('exercises.search')} className="field pl-9" />
        </label>
        {muscles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(muscles)].map((m) => (
              <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
                {muscleName(m)}
              </Chip>
            ))}
          </div>
        )}
        {!matches.length ? (
          <p className="py-6 text-center text-sm text-muted">{t('exercises.none')}</p>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
            {matches.slice(0, limit).map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(e)
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-surface-2"
                >
                  <ExerciseImage exercise={e} className="size-12 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.name}</span>
                    <span className="block truncate text-xs text-subtle">{[muscleName(e.primaryMuscles[0] ?? ''), equipmentName(e.equipment)].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {matches.length > limit && (
          <Button variant="plain" onClick={() => setLimit(limit + PAGE)}>
            {t('common.showMore', { count: matches.length - limit })}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
