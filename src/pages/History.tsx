import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiNotice } from '../components/ApiNotice'
import { ExerciseImage } from '../components/ExerciseImage'
import { IconChevronLeft, IconCopy, IconEdit, IconPlay, IconTrash, IconTrophy } from '../components/icons'
import { PageHeader, SectionHeader } from '../components/Layout'
import { Button, Card, Empty, Label, NumberInput, Skeleton, StatTile } from '../components/ui'
import { WorkoutEditor } from '../components/WorkoutEditor'
import { WorkoutRow } from '../components/WorkoutRow'
import { type ApiError, toApiError } from '../lib/api'
import { cn } from '../lib/cn'
import { useExercises } from '../lib/exercises'
import { useFormat } from '../lib/format'
import { itemsFromWorkout, recordSets, workoutTotals } from '../lib/plan'
import { useCurrentProgram } from '../lib/programs'
import { deleteWorkout, saveTemplate, saveWorkout, useExerciseStats, useWorkout, useWorkouts } from '../lib/storage'
import type { Workout } from '../lib/types'
import { useStartWorkout } from '../lib/useStartWorkout'
import { useI18n } from '../locales'

export function History() {
  const { t } = useI18n()
  const { formatMonth } = useFormat()
  const workouts = useWorkouts({ status: 'done', limit: 500 })
  const groups = new Map<string, Workout[]>()
  for (const w of workouts.data ?? []) {
    const m = w.date.slice(0, 7)
    groups.set(m, [...(groups.get(m) ?? []), w])
  }
  return (
    <>
      <SectionHeader section="progress" sub={workouts.data ? t('history.count', { count: workouts.data.length }) : undefined} />
      {workouts.error && <ApiNotice error={workouts.error} onRetry={workouts.reload} />}
      {workouts.loading && !workouts.data ? (
        <Skeleton className="h-64" />
      ) : !workouts.data?.length ? (
        <Empty action={<Link to="/" className="text-sm text-accent hover:underline">{t('dashboard.title')}</Link>}>{t('history.empty')}</Empty>
      ) : (
        [...groups].map(([month, list]) => (
          <Card key={month} title={formatMonth(`${month}-01`)} action={<span className="text-xs text-subtle">{t('history.count', { count: list.length })}</span>}>
            <ul className="-mx-2 grid divide-y divide-border">
              {list.map((w) => (
                <li key={w.id}>
                  <WorkoutRow workout={w} />
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </>
  )
}

export function WorkoutDetail() {
  const { id } = useParams()
  const workout = useWorkout(id)
  if (workout.error) return <ApiNotice error={workout.error} onRetry={workout.reload} />
  if (!workout.data) return <Skeleton className="h-96" />
  return <Detail key={workout.data.id} workout={workout.data} />
}

function Detail({ workout }: { workout: Workout }) {
  const { t } = useI18n()
  const { formatDayHeader, formatDuration, formatKg, formatNumber, formatSet, formatTime, muscleName } = useFormat()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { byId } = useExercises()
  const start = useStartWorkout()
  const program = useCurrentProgram()
  const stats = useExerciseStats(workout.exercises.map((e) => e.exerciseId), workout.id)
  const [editing, setEditing] = useState<Workout | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [savedTemplate, setSavedTemplate] = useState<string | null>(null)
  const justDone = params.get('done') === '1'

  const w = editing ?? workout
  const totals = workoutTotals(w)
  const records = recordSets(w, stats.data)

  const run = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(toApiError(e))
    }
  }

  return (
    <>
      <Link to="/history" className="inline-flex items-center gap-1 justify-self-start text-sm text-muted hover:text-fg">
        <IconChevronLeft className="size-4" />
        {t('history.title')}
      </Link>
      {justDone && !editing && (
        <div className="rounded-2xl border border-accent/50 bg-gradient-to-br from-accent/20 via-surface to-surface p-5">
          <div className="font-mono text-[11px] tracking-wider text-accent uppercase">{t('summary.done')}</div>
          <p className="mt-1 text-lg font-semibold">{records.size ? t('summary.records', { count: records.size }) : t('summary.great')}</p>
        </div>
      )}
      <PageHeader
        title={w.name || t('workout.untitled')}
        sub={`${formatDayHeader(w.date)}${w.startedAt ? ` · ${formatTime(w.startedAt)}` : ''}`}
        actions={
          !editing && (
            <>
              <Button onClick={() => start({ name: w.name, templateId: w.templateId, items: itemsFromWorkout(w) })}>
                <IconPlay className="size-4" />
                {t('history.repeat')}
              </Button>
              <Button onClick={() => setEditing(structuredClone(workout))}>
                <IconEdit className="size-4" />
                {t('common.edit')}
              </Button>
            </>
          )
        }
      />
      {error && <ApiNotice error={error} />}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('stats.time')} value={formatDuration(w.durationSec)} />
        <StatTile label={t('stats.sets')} value={totals.sets} />
        <StatTile label={t('stats.reps')} value={formatNumber(totals.reps)} />
        <StatTile label={t('stats.volume')} value={formatKg(Math.round(totals.volumeKg))} />
      </div>

      {editing ? (
        <div className="mx-auto grid w-full max-w-3xl gap-3">
          <Card className="grid gap-3 sm:grid-cols-3">
            <Label text={t('workout.name')}>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value.slice(0, 100) })} className="field" />
            </Label>
            <Label text={t('workout.date')}>
              <input type="date" value={editing.date} onChange={(e) => e.target.value && setEditing({ ...editing, date: e.target.value })} className="field" />
            </Label>
            <Label text={t('workout.durationMin')}>
              <NumberInput label={t('workout.durationMin')} value={Math.round(editing.durationSec / 60)} onChange={(m) => setEditing({ ...editing, durationSec: Math.round((m ?? 0) * 60) })} integer max={1440} className="text-left" />
            </Label>
          </Card>
          <WorkoutEditor workout={editing} onChange={(fn) => setEditing((e) => (e ? fn(e) : e))} stats={stats.data} />
          <Label text={t('workout.note')}>
            <textarea value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value.slice(0, 2000) })} rows={2} className="field resize-none" />
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() =>
                void run(async () => {
                  await saveWorkout(editing)
                  setEditing(null)
                })
              }
            >
              {t('common.save')}
            </Button>
            <Button onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
          {w.exercises.map((ex, i) => {
            const e = byId.get(ex.exerciseId)
            return (
              <Card key={`${ex.exerciseId}-${i}`}>
                <div className="flex items-center gap-3">
                  <ExerciseImage exercise={e} className="size-11 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/exercises/${encodeURIComponent(ex.exerciseId)}`} className="block truncate text-sm font-semibold hover:text-accent">
                      {e?.name ?? ex.name}
                    </Link>
                    <span className="text-xs text-subtle">{muscleName(ex.muscle)}</span>
                  </div>
                </div>
                {ex.note && <p className="mt-2 text-xs text-muted">{ex.note}</p>}
                <ol className="mt-3 grid gap-1">
                  {ex.sets.map((s, j) => (
                    <li key={j} className={cn('flex items-center gap-3 rounded-md px-2 py-1 font-mono text-sm tabular-nums', s.done ? 'bg-surface-2' : 'text-subtle line-through')}>
                      <span className="w-5 text-xs text-subtle">{j + 1}</span>
                      <span className="flex-1">{formatSet(s, ex.trackingType)}</span>
                      {records.has(`${i}:${j}`) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cat-2/15 px-2 py-0.5 font-sans text-[11px] text-cat-2">
                          <IconTrophy className="size-3" /> {t('summary.pr')}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </Card>
            )
          })}
          {w.note && (
            <Card title={t('workout.note')}>
              <p className="text-sm whitespace-pre-wrap text-muted">{w.note}</p>
            </Card>
          )}
        </div>
      )}

      {!editing && (
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button
            variant="plain"
            onClick={() =>
              void run(async () => {
                const id = crypto.randomUUID()
                await saveTemplate({ id, programId: program.current?.id ?? null, name: w.name || t('templates.untitled'), note: '', color: 'c1', items: itemsFromWorkout(w), position: program.days.length })
                setSavedTemplate(id)
              })
            }
          >
            <IconCopy className="size-4" />
            {t('history.saveAsTemplate')}
          </Button>
          {savedTemplate && (
            <Link to={`/templates/${savedTemplate}`} className="self-center text-sm text-accent hover:underline">
              {t('history.templateSaved')}
            </Link>
          )}
          <Button
            variant="plain"
            className="text-expense"
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true)
              void run(async () => {
                await deleteWorkout(workout.id)
                navigate('/history')
              })
            }}
          >
            <IconTrash className="size-4" />
            {confirmDelete ? t('history.deleteConfirm') : t('history.delete')}
          </Button>
        </div>
      )}
    </>
  )
}
