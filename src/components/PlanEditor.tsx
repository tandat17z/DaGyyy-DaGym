import { useState } from 'react'
import { useExercises } from '../lib/exercises'
import { defaultSets, moveItem, planItemFor } from '../lib/plan'
import type { PlanItem } from '../lib/types'
import { useI18n } from '../locales'
import { ExerciseBlock, ExerciseOptions } from './ExerciseBlock'
import { ExercisePicker } from './ExercisePicker'
import { IconPlus } from './icons'
import { Button, Empty } from './ui'

/** Exercises and target sets of a template or a custom day. */
export function PlanEditor({ items, onChange }: { items: PlanItem[]; onChange: (items: PlanItem[]) => void }) {
  const { t } = useI18n()
  const { byId } = useExercises()
  const [picking, setPicking] = useState(false)
  const [options, setOptions] = useState<number | null>(null)

  const patch = (i: number, p: Partial<PlanItem>) => onChange(items.map((it, k) => (k === i ? { ...it, ...p } : it)))
  const opened = options == null ? undefined : items[options]

  return (
    <div className="grid gap-3">
      {!items.length && <Empty>{t('plan.noExercises')}</Empty>}
      {items.map((it, i) => {
        const ex = byId.get(it.exerciseId)
        const type = it.trackingType ?? ex?.trackingType ?? 'reps_weight'
        return (
          <ExerciseBlock
            key={`${it.exerciseId}-${i}`}
            mode="plan"
            exercise={ex}
            fallbackName={it.exerciseId}
            trackingType={type}
            restSec={it.restSec}
            note={it.note}
            sets={it.sets}
            onSetChange={(j, p) => patch(i, { sets: it.sets.map((s, k) => (k === j ? { ...s, ...p } : s)) })}
            onAddSet={() => patch(i, { sets: [...it.sets, { ...(it.sets.at(-1) ?? defaultSets(type, 1)[0]) }] })}
            onRemoveSet={(j) => patch(i, { sets: it.sets.filter((_, k) => k !== j) })}
            onOptions={() => setOptions(i)}
          />
        )
      })}
      <Button onClick={() => setPicking(true)} className="w-full py-3">
        <IconPlus className="size-4" />
        {t('plan.addExercise')}
      </Button>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={(list) => onChange([...items, ...list.map(planItemFor)])} />
      {opened && options != null && (
        <ExerciseOptions
          open
          onClose={() => setOptions(null)}
          name={byId.get(opened.exerciseId)?.name ?? opened.exerciseId}
          restSec={opened.restSec}
          trackingType={opened.trackingType ?? byId.get(opened.exerciseId)?.trackingType ?? 'reps_weight'}
          note={opened.note}
          onChange={(p) => patch(options, p)}
          onMove={(d) => {
            onChange(moveItem(items, options, d))
            setOptions(options + d)
          }}
          onRemove={() => onChange(items.filter((_, k) => k !== options))}
          canMoveUp={options > 0}
          canMoveDown={options < items.length - 1}
        />
      )}
    </div>
  )
}

