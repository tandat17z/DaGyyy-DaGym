import { useMemo, useState } from 'react'
import { MUSCLES } from '../config/muscles'
import { cn } from '../lib/cn'
import { searchable, useExercises } from '../lib/exercises'
import { useFormat } from '../lib/format'
import type { Exercise } from '../lib/types'
import { useI18n } from '../locales'
import { ExerciseImage } from './ExerciseImage'
import { IconCheck, IconSearch } from './icons'
import { Button, Chip, Sheet } from './ui'

const PAGE = 80

/** Pick one or more exercises from the dictionary. */
export function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (exercises: Exercise[]) => void }) {
  const { t } = useI18n()
  const { muscleName, equipmentName } = useFormat()
  const { list, byId, loading } = useExercises()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [limit, setLimit] = useState(PAGE)

  const matches = useMemo(() => {
    const q = searchable(query.trim())
    return list.filter((e) => (!muscle || e.primaryMuscles.includes(muscle)) && (!q || (searchable(e.name).includes(q) || searchable(e.altName).includes(q))))
  }, [list, query, muscle])

  const close = () => {
    setPicked([])
    setQuery('')
    setLimit(PAGE)
    onClose()
  }
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('picker.title')}
      wide
      tall
      footer={
        <>
          <Button onClick={close}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            disabled={!picked.length}
            onClick={() => {
              onPick(picked.map((id) => byId.get(id)).filter((e): e is Exercise => !!e))
              close()
            }}
          >
            {t('picker.add', { count: picked.length })}
          </Button>
        </>
      }
    >
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 grid gap-2 border-b border-border bg-surface px-4 pt-4 pb-3">
        <label className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            data-autofocus
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(PAGE)
            }}
            placeholder={t('exercises.search')}
            aria-label={t('exercises.search')}
            className="field pl-9"
          />
        </label>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          <Chip active={!muscle} onClick={() => setMuscle(null)}>
            {t('exercises.allMuscles')}
          </Chip>
          {MUSCLES.map((m) => (
            <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
              {muscleName(m)}
            </Chip>
          ))}
        </div>
      </div>
      {loading ? (
        <p className="py-6 text-center text-sm text-muted">{t('common.loading')}</p>
      ) : (
        <ul className="mt-3 grid gap-1">
          {matches.slice(0, limit).map((e) => {
            const on = picked.includes(e.id)
            return (
              <li key={e.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(e.id)}
                  className={cn('flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors', on ? 'bg-accent/10' : 'hover:bg-surface-2')}
                >
                  <ExerciseImage exercise={e} className="size-12 shrink-0 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.name}</span>
                    <span className="block truncate text-xs text-subtle">
                      {[muscleName(e.primaryMuscles[0] ?? ''), equipmentName(e.equipment)].filter(Boolean).join(' · ')}
                      {e.custom && ` · ${t('exercises.custom')}`}
                    </span>
                  </span>
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border', on ? 'border-accent bg-accent text-accent-fg' : 'border-border-strong')}>
                    {on && <IconCheck className="size-4" />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!loading && !matches.length && <p className="py-6 text-center text-sm text-muted">{t('exercises.none')}</p>}
      {matches.length > limit && (
        <div className="mt-3 text-center">
          <Button onClick={() => setLimit((l) => l + PAGE)}>{t('common.showMore', { count: matches.length - limit })}</Button>
        </div>
      )}
    </Sheet>
  )
}
