import { useState } from 'react'
import { cn } from '../lib/cn'
import { useExercises } from '../lib/exercises'
import { useFormat } from '../lib/format'
import { defaultSets, planItemFor, REST_OPTIONS } from '../lib/plan'
import type { PlanItem, SetValues, TrackingType } from '../lib/types'
import { moveTo, useDragSort } from '../lib/useDragSort'
import { useI18n } from '../locales'
import { ExerciseImage } from './ExerciseImage'
import { ExercisePicker } from './ExercisePicker'
import { IconGrip, IconPlus, IconTrash } from './icons'
import { Button, Empty, NumberInput } from './ui'

/**
 * Exercises of a workout day, one compact row each: sets × kg × reps (every set gets the same
 * targets), rest time, note and delete; drag the handle to reorder.
 */
export function PlanEditor({ items, onChange }: { items: PlanItem[]; onChange: (items: PlanItem[]) => void }) {
  const { t } = useI18n()
  const { byId } = useExercises()
  const [picking, setPicking] = useState(false)
  const sort = useDragSort(items.length, (from, to) => onChange(moveTo(items, from, to)))

  const patch = (i: number, p: Partial<PlanItem>) => onChange(items.map((it, k) => (k === i ? { ...it, ...p } : it)))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {!items.length && <Empty>{t('plan.noExercises')}</Empty>}
      {sort.order.map((i) => {
        const it = items[i] as PlanItem
        const ex = byId.get(it.exerciseId)
        const type = it.trackingType ?? ex?.trackingType ?? 'reps_weight'
        return (
          <PlanRow
            key={`${it.exerciseId}-${i}`}
            rowRef={sort.rowRef(i)}
            handle={sort.handle(i)}
            dragging={sort.dragging === i}
            item={it}
            type={type}
            onPatch={(p) => patch(i, p)}
            onRemove={() => onChange(items.filter((_, k) => k !== i))}
          />
        )
      })}
      <Button onClick={() => setPicking(true)} className="w-full py-3">
        <IconPlus className="size-4" />
        {t('plan.addExercise')}
      </Button>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={(list) => onChange([...items, ...list.map(planItemFor)])} />
    </div>
  )
}

function PlanRow({
  rowRef,
  handle,
  dragging,
  item,
  type,
  onPatch,
  onRemove,
}: {
  rowRef: (el: HTMLElement | null) => void
  handle: ReturnType<ReturnType<typeof useDragSort>['handle']>
  dragging: boolean
  item: PlanItem
  type: TrackingType
  onPatch: (p: Partial<PlanItem>) => void
  onRemove: () => void
}) {
  const { t } = useI18n()
  const { muscleName, formatSeconds } = useFormat()
  const { byId } = useExercises()
  const ex = byId.get(item.exerciseId)
  const base: SetValues = item.sets[0] ?? defaultSets(type, 1)[0] ?? {}
  const count = item.sets.length
  // Every set gets the same targets.
  const setAll = (p: Partial<SetValues>) => onPatch({ sets: Array.from({ length: Math.max(1, count) }, () => ({ ...base, ...p })) })
  const setCount = (n: number | null) => n && onPatch({ sets: Array.from({ length: Math.min(30, n) }, (_, k) => ({ ...(item.sets[k] ?? base) })) })
  const minutes = base.seconds == null ? null : Math.round((base.seconds / 60) * 10) / 10
  const box = 'h-9 w-12 px-1 sm:w-14'

  return (
    <section ref={rowRef} className={cn('min-w-0 rounded-xl border bg-surface p-2.5 transition-shadow sm:p-3', dragging ? 'z-10 border-accent shadow-2xl shadow-black/60' : 'border-border')}>
      <div className="flex items-center gap-2">
        <button type="button" {...handle} aria-label={t('plan.dragToReorder')} title={t('plan.dragToReorder')} className="grid h-11 w-6 shrink-0 cursor-grab place-items-center rounded-md text-subtle hover:text-fg active:cursor-grabbing">
          <IconGrip className="size-4" />
        </button>
        <ExerciseImage exercise={ex} className="size-11 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{ex?.name ?? item.exerciseId}</div>
          <div className="truncate text-xs text-subtle">{muscleName(ex?.primaryMuscles[0] ?? '')}</div>
        </div>
        <button type="button" onClick={onRemove} aria-label={t('block.remove')} title={t('block.remove')} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-expense/10 hover:text-expense">
          <IconTrash className="size-4" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2 font-mono text-xs text-subtle sm:gap-x-1.5 sm:pl-8">
        <NumberInput label={t('plan.sets')} value={count} onChange={setCount} className={box} integer max={30} />
        <span>{t('plan.setsShort')}</span>
        {type === 'reps_weight' && (
          <>
            <span>×</span>
            <NumberInput label={t('set.weight')} value={base.weight} onChange={(weight) => setAll({ weight })} className={box} max={10_000} placeholder="–" />
            <span>kg</span>
          </>
        )}
        {(type === 'reps_weight' || type === 'reps') && (
          <>
            <span>×</span>
            <NumberInput label={t('set.reps')} value={base.reps} onChange={(reps) => setAll({ reps })} className={box} integer max={1000} placeholder="–" />
            <span>{t('plan.repsShort')}</span>
          </>
        )}
        {type === 'time' && (
          <>
            <span>×</span>
            <NumberInput label={t('set.seconds')} value={base.seconds} onChange={(seconds) => setAll({ seconds })} className={box} integer max={86_400} placeholder="–" />
            <span>s</span>
          </>
        )}
        {type === 'distance_time' && (
          <>
            <span>×</span>
            <NumberInput label={t('set.distance')} value={base.distance} onChange={(distance) => setAll({ distance })} className={box} max={10_000} placeholder="–" />
            <span>km</span>
            <NumberInput label={t('set.minutes')} value={minutes} onChange={(m) => setAll({ seconds: m == null ? null : Math.round(m * 60) })} className={box} max={1440} placeholder="–" />
            <span>min</span>
          </>
        )}
        <label className="ml-auto flex items-center gap-1.5 font-sans">
          <span>{t('rest.title')}</span>
          <select value={item.restSec} onChange={(e) => onPatch({ restSec: Number(e.target.value) })} className="field h-9 w-auto py-0 pr-7 pl-2 font-mono text-xs" aria-label={t('block.restTime')}>
            {[...new Set([...REST_OPTIONS, item.restSec])]
              .sort((a, b) => a - b)
              .map((s) => (
                <option key={s} value={s}>
                  {s ? formatSeconds(s) : t('block.off')}
                </option>
              ))}
          </select>
        </label>
      </div>
      <input
        value={item.note}
        onChange={(e) => onPatch({ note: e.target.value.slice(0, 500) })}
        placeholder={t('ex.addNote')}
        aria-label={t('block.note')}
        className="mt-2 w-full rounded-md bg-transparent px-1 py-1 text-base text-muted sm:text-xs outline-none placeholder:text-subtle focus:bg-surface-2 sm:ml-8 sm:w-[calc(100%-2rem)]"
      />
    </section>
  )
}
