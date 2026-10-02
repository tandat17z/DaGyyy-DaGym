import { useState } from 'react'
import { useExercises } from '../lib/exercises'
import { fillFrom, loggedExerciseFor, moveItem, planItemFor, recordSets } from '../lib/plan'
import type { ExerciseStats, LoggedExercise, LoggedSet, Workout } from '../lib/types'
import { useI18n } from '../locales'
import { ExerciseBlock, ExerciseOptions } from './ExerciseBlock'
import { ExercisePicker } from './ExercisePicker'
import { IconPlus } from './icons'
import { Button, Empty } from './ui'

export interface LiveControls {
  toggleSet: (exercise: number, set: number) => void
  timer: { exercise: number; set: number; elapsedSec: number; targetSec: number | null } | null
  startTimer: (exercise: number, set: number) => void
  stopTimer: () => void
}

/**
 * The exercises and sets of a workout. With `live` the ✓ buttons drive the session (rest timer,
 * stopwatch); without it (editing a finished workout) ✓ just flips the set.
 */
export function WorkoutEditor({ workout, onChange, stats, live }: { workout: Workout; onChange: (fn: (w: Workout) => Workout) => void; stats?: Record<string, ExerciseStats>; live?: LiveControls }) {
  const { t } = useI18n()
  const { byId } = useExercises()
  const [picking, setPicking] = useState(false)
  const [options, setOptions] = useState<number | null>(null)
  const records = recordSets(workout, stats)
  const recordOf = (i: number) => {
    for (const r of records) {
      const [e, set] = r.split(':').map(Number)
      if (e === i) return set
    }
  }

  const setExercises = (fn: (list: LoggedExercise[]) => LoggedExercise[]) => onChange((w) => ({ ...w, exercises: fn(w.exercises) }))
  const patchExercise = (i: number, p: Partial<LoggedExercise>) => setExercises((list) => list.map((e, k) => (k === i ? { ...e, ...p } : e)))
  const patchSet = (i: number, j: number, p: Partial<LoggedSet>) =>
    setExercises((list) => list.map((e, k) => (k === i ? { ...e, sets: e.sets.map((s, m) => (m === j ? { ...s, ...p } : s)) } : e)))

  const opened = options == null ? undefined : workout.exercises[options]

  return (
    <div className="grid gap-3">
      {!workout.exercises.length && <Empty>{t('workout.empty')}</Empty>}
      {workout.exercises.map((ex, i) => {
        const prev = stats?.[ex.exerciseId]?.last?.sets
        const timer = live?.timer?.exercise === i ? live.timer : null
        return (
          <ExerciseBlock
            key={`${ex.exerciseId}-${i}`}
            mode="log"
            exercise={byId.get(ex.exerciseId)}
            fallbackName={ex.name}
            trackingType={ex.trackingType}
            restSec={ex.restSec}
            note={ex.note}
            sets={ex.sets}
            previous={prev}
            recordSet={recordOf(i)}
            onSetChange={(j, p) => patchSet(i, j, p)}
            onAddSet={() =>
              setExercises((list) =>
                list.map((e, k) => {
                  if (k !== i) return e
                  const last = e.sets.at(-1)
                  return { ...e, sets: [...e.sets, { reps: last?.reps ?? null, weight: last?.weight ?? null, seconds: last?.seconds ?? null, distance: last?.distance ?? null, done: false }] }
                }),
              )
            }
            onRemoveSet={(j) => setExercises((list) => list.map((e, k) => (k === i ? { ...e, sets: e.sets.filter((_, m) => m !== j) } : e)))}
            onOptions={() => setOptions(i)}
            onToggle={(j) => {
              const s = ex.sets[j]
              // ✓ on an empty row takes last time's values.
              const fill = s && !s.done ? fillFrom(s, prev?.[j], ex.trackingType) : null
              if (fill) patchSet(i, j, fill)
              if (live) live.toggleSet(i, j)
              else patchSet(i, j, { done: !s?.done })
            }}
            timer={timer ? { set: timer.set, elapsedSec: timer.elapsedSec, targetSec: timer.targetSec } : null}
            onStartTimer={live ? (j) => live.startTimer(i, j) : undefined}
            onStopTimer={live?.stopTimer}
          />
        )
      })}
      <Button onClick={() => setPicking(true)} className="w-full py-3">
        <IconPlus className="size-4" />
        {t('plan.addExercise')}
      </Button>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(list) => setExercises((cur) => [...cur, ...list.map((e) => loggedExerciseFor(planItemFor(e), e))])}
      />
      {opened && options != null && (
        <ExerciseOptions
          open
          onClose={() => setOptions(null)}
          name={byId.get(opened.exerciseId)?.name ?? opened.name}
          restSec={opened.restSec}
          trackingType={opened.trackingType}
          note={opened.note}
          onChange={(p) => patchExercise(options, p)}
          onMove={(d) => {
            setExercises((list) => moveItem(list, options, d))
            setOptions(options + d)
          }}
          onRemove={() => setExercises((list) => list.filter((_, k) => k !== options))}
          canMoveUp={options > 0}
          canMoveDown={options < workout.exercises.length - 1}
        />
      )}
    </div>
  )
}
