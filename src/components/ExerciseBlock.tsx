import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TRACKING_TYPES } from '../config/muscles'
import { cn } from '../lib/cn'
import { clock, useFormat } from '../lib/format'
import type { Exercise, SetValues, TrackingType } from '../lib/types'
import { useI18n } from '../locales'
import { ExerciseImage } from './ExerciseImage'
import { IconCheck, IconDown, IconMore, IconPlay, IconPlus, IconStop, IconTrash, IconTrophy, IconUp, IconX } from './icons'
import { Button, IconButton, Label, NumberInput, Sheet } from './ui'

// One exercise of a plan (targets only) or of a workout being logged (✓ per set, previous values,
// set stopwatch, record badges). PlanEditor and WorkoutEditor map their own data onto it.

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300]

export interface BlockSet extends SetValues {
  done?: boolean
}

export interface BlockProps {
  mode: 'plan' | 'log'
  exercise: Exercise | undefined
  /** Name to show when the exercise is not in the dictionary (deleted custom exercise). */
  fallbackName: string
  trackingType: TrackingType
  restSec: number
  note: string
  sets: BlockSet[]
  onSetChange: (index: number, patch: Partial<BlockSet>) => void
  onAddSet: () => void
  onRemoveSet: (index: number) => void
  onOptions: () => void
  // log mode
  onToggle?: (index: number) => void
  previous?: SetValues[]
  recordSet?: number
  /** Running stopwatch of a timed set of this exercise. */
  timer?: { set: number; elapsedSec: number; targetSec: number | null } | null
  onStartTimer?: (index: number) => void
  onStopTimer?: () => void
}

const COLS: Record<TrackingType, string> = {
  reps_weight: 'grid-cols-[1.75rem_minmax(0,1fr)_4.25rem_3.75rem_2.5rem_1.5rem]',
  reps: 'grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_2.5rem_1.5rem]',
  time: 'grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_2.5rem_2.5rem_1.5rem]',
  distance_time: 'grid-cols-[1.75rem_minmax(0,1fr)_4rem_4rem_2.5rem_1.5rem]',
}
// Plan mode has no "previous" column and no ✓.
const PLAN_COLS: Record<TrackingType, string> = {
  reps_weight: 'grid-cols-[1.75rem_minmax(0,6rem)_minmax(0,6rem)_1.5rem]',
  reps: 'grid-cols-[1.75rem_minmax(0,6rem)_1.5rem]',
  time: 'grid-cols-[1.75rem_minmax(0,6rem)_1.5rem]',
  distance_time: 'grid-cols-[1.75rem_minmax(0,6rem)_minmax(0,6rem)_1.5rem]',
}

export function ExerciseBlock(p: BlockProps) {
  const { t } = useI18n()
  const { muscleName, formatSet, formatSeconds } = useFormat()
  const type = p.trackingType
  const log = p.mode === 'log'
  const cols = log ? COLS[type] : PLAN_COLS[type]
  const name = p.exercise?.name ?? p.fallbackName
  const muscle = p.exercise?.primaryMuscles[0]

  const fields = (s: BlockSet, j: number) => {
    const prev = p.previous?.[j]
    const ph = (v: number | null | undefined) => (v == null ? undefined : String(v))
    const cls = cn('h-9 px-1', s.done && 'border-income/30 bg-income/5')
    if (type === 'reps_weight')
      return (
        <>
          <NumberInput label={t('set.weight')} value={s.weight} placeholder={ph(prev?.weight)} onChange={(weight) => p.onSetChange(j, { weight })} className={cls} max={10_000} />
          <NumberInput label={t('set.reps')} value={s.reps} placeholder={ph(prev?.reps)} onChange={(reps) => p.onSetChange(j, { reps })} className={cls} integer max={1000} />
        </>
      )
    if (type === 'reps') return <NumberInput label={t('set.reps')} value={s.reps} placeholder={ph(prev?.reps)} onChange={(reps) => p.onSetChange(j, { reps })} className={cls} integer max={1000} />
    if (type === 'time') {
      const running = p.timer?.set === j
      if (running && p.timer) {
        const left = p.timer.targetSec ? p.timer.targetSec - p.timer.elapsedSec : null
        return <div className="grid h-9 place-items-center rounded-lg border border-accent/60 bg-accent/10 font-mono text-sm text-accent tabular-nums">{clock(left ?? p.timer.elapsedSec)}</div>
      }
      return <NumberInput label={t('set.seconds')} value={s.seconds} placeholder={ph(prev?.seconds)} onChange={(seconds) => p.onSetChange(j, { seconds })} className={cls} integer max={86_400} />
    }
    const minutes = s.seconds == null ? null : Math.round((s.seconds / 60) * 10) / 10
    return (
      <>
        <NumberInput label={t('set.distance')} value={s.distance} placeholder={ph(prev?.distance)} onChange={(distance) => p.onSetChange(j, { distance })} className={cls} max={10_000} />
        <NumberInput label={t('set.minutes')} value={minutes} placeholder={prev?.seconds ? String(Math.round(prev.seconds / 6) / 10) : undefined} onChange={(m) => p.onSetChange(j, { seconds: m == null ? null : Math.round(m * 60) })} className={cls} max={1440} />
      </>
    )
  }

  const headers =
    type === 'reps_weight' ? [t('set.kg'), t('set.reps')] : type === 'reps' ? [t('set.reps')] : type === 'time' ? [t('set.sec')] : [t('set.km'), t('set.min')]

  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-3 sm:p-4">
      <header className="flex items-center gap-3">
        <Link to={`/exercises/${encodeURIComponent(p.exercise?.id ?? '')}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
          <ExerciseImage exercise={p.exercise} className="size-11 rounded-lg" />
        </Link>
        <div className="min-w-0 flex-1">
          {p.exercise ? (
            <Link to={`/exercises/${encodeURIComponent(p.exercise.id)}`} className="block truncate text-sm font-semibold hover:text-accent">
              {name}
            </Link>
          ) : (
            <span className="block truncate text-sm font-semibold">{name}</span>
          )}
          <span className="block truncate text-xs text-subtle">
            {[muscleName(muscle ?? ''), p.restSec ? t('block.rest', { time: formatSeconds(p.restSec) }) : t('block.noRest')].filter(Boolean).join(' · ')}
          </span>
        </div>
        <IconButton label={t('block.options')} onClick={p.onOptions}>
          <IconMore />
        </IconButton>
      </header>
      {p.note && <p className="mt-2 rounded-md bg-surface-2 px-2.5 py-1.5 text-xs text-muted">{p.note}</p>}

      <div className="mt-3 grid gap-1.5">
        <div className={cn('grid items-center gap-1.5 px-0.5 font-mono text-[10px] tracking-wider text-subtle uppercase', cols)}>
          <span className="text-center">{t('set.set')}</span>
          {log && <span>{t('set.previous')}</span>}
          {headers.map((h) => (
            <span key={h} className="text-center">
              {h}
            </span>
          ))}
          {log && type === 'time' && <span />}
          {log && <span className="text-center">✓</span>}
          <span />
        </div>
        {p.sets.map((s, j) => {
          const prev = p.previous?.[j]
          return (
            <div key={j} className={cn('grid items-center gap-1.5 rounded-lg px-0.5 py-0.5 transition-colors', cols, s.done && 'bg-income/10')}>
              <span className="relative text-center font-mono text-xs text-muted tabular-nums">
                {j + 1}
                {p.recordSet === j && <IconTrophy className="absolute -top-2 -right-1 size-3.5 text-cat-2" />}
              </span>
              {log && (
                <button
                  type="button"
                  disabled={!prev}
                  onClick={() => prev && p.onSetChange(j, { reps: prev.reps ?? null, weight: prev.weight ?? null, seconds: prev.seconds ?? null, distance: prev.distance ?? null })}
                  title={prev ? t('set.usePrevious') : undefined}
                  className="truncate text-left font-mono text-xs text-subtle tabular-nums enabled:hover:text-fg"
                >
                  {prev ? formatSet(prev, type) : '—'}
                </button>
              )}
              {fields(s, j)}
              {log && type === 'time' && (
                <IconButton
                  label={p.timer?.set === j ? t('set.stopTimer') : t('set.startTimer')}
                  onClick={() => (p.timer?.set === j ? p.onStopTimer?.() : p.onStartTimer?.(j))}
                  className={cn('size-9', p.timer?.set === j && 'text-accent')}
                >
                  {p.timer?.set === j ? <IconStop className="size-4" /> : <IconPlay className="size-4" />}
                </IconButton>
              )}
              {log && (
                <button
                  type="button"
                  aria-pressed={!!s.done}
                  aria-label={t('set.done', { n: j + 1 })}
                  onClick={() => p.onToggle?.(j)}
                  className={cn('grid size-9 place-items-center rounded-lg border transition-colors', s.done ? 'border-income bg-income text-accent-fg' : 'border-border-strong text-subtle hover:border-muted hover:text-fg')}
                >
                  <IconCheck className="size-5" />
                </button>
              )}
              <button type="button" aria-label={t('set.remove', { n: j + 1 })} onClick={() => p.onRemoveSet(j)} className="grid h-9 place-items-center text-subtle hover:text-expense">
                <IconX className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
      <Button variant="plain" onClick={p.onAddSet} className="mt-2 w-full">
        <IconPlus className="size-4" />
        {t('set.add')}
      </Button>
    </section>
  )
}

/** Rest time, logging type, note, order and removal of one exercise. */
export function ExerciseOptions({
  open,
  onClose,
  name,
  restSec,
  trackingType,
  note,
  onChange,
  onMove,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  open: boolean
  onClose: () => void
  name: string
  restSec: number
  trackingType: TrackingType
  note: string
  onChange: (patch: { restSec?: number; trackingType?: TrackingType; note?: string }) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const { t } = useI18n()
  const { formatSeconds, trackingName } = useFormat()
  const [confirm, setConfirm] = useState(false)
  return (
    <Sheet
      open={open}
      onClose={() => {
        setConfirm(false)
        onClose()
      }}
      title={name}
      footer={<Button onClick={onClose}>{t('common.done')}</Button>}
    >
      <div className="grid gap-4">
        <Label text={t('block.restTime')}>
          <div className="flex flex-wrap gap-1.5">
            {REST_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={restSec === s}
                onClick={() => onChange({ restSec: s })}
                className={cn('rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums', restSec === s ? 'border-accent bg-accent/15 text-accent' : 'border-border-strong text-muted hover:text-fg')}
              >
                {s ? formatSeconds(s) : t('block.off')}
              </button>
            ))}
          </div>
        </Label>
        <Label text={t('block.tracking')}>
          <select value={trackingType} onChange={(e) => onChange({ trackingType: e.target.value as TrackingType })} className="field">
            {TRACKING_TYPES.map((k) => (
              <option key={k} value={k}>
                {trackingName(k)}
              </option>
            ))}
          </select>
        </Label>
        <Label text={t('block.note')}>
          <textarea value={note} onChange={(e) => onChange({ note: e.target.value.slice(0, 500) })} rows={2} className="field resize-none" placeholder={t('block.notePlaceholder')} />
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!canMoveUp} onClick={() => onMove(-1)}>
            <IconUp className="size-4" />
            {t('block.moveUp')}
          </Button>
          <Button disabled={!canMoveDown} onClick={() => onMove(1)}>
            <IconDown className="size-4" />
            {t('block.moveDown')}
          </Button>
          <Button
            variant="danger"
            className="ml-auto"
            onClick={() => {
              if (!confirm) return setConfirm(true)
              setConfirm(false)
              onRemove()
              onClose()
            }}
          >
            <IconTrash className="size-4" />
            {confirm ? t('block.removeConfirm') : t('block.remove')}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
