import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiNotice } from '../components/ApiNotice'
import { ExerciseImage } from '../components/ExerciseImage'
import { ExercisePicker } from '../components/ExercisePicker'
import { IconArrowLeft, IconCheck, IconChevronLeft, IconChevronRight, IconEdit, IconLock, IconNote, IconPlay, IconPlus, IconStop, IconSwap, IconTrash, IconX } from '../components/icons'
import { Ring } from '../components/Ring'
import { SwapSheet } from '../components/SwapSheet'
import { Button, Card, Empty, IconButton, Label, NumberInput, Sheet, Skeleton } from '../components/ui'
import { colorOf } from '../config/colors'
import { type ApiError, toApiError } from '../lib/api'
import { cn } from '../lib/cn'
import { todayIso } from '../lib/date'
import { useExercises } from '../lib/exercises'
import { clock, useFormat } from '../lib/format'
import { loggedExerciseFor, planItemFor, swapLoggedExercise, swapPlanItem, workoutTotals } from '../lib/plan'
import { currentDay, type DayItem, estimateSec, itemProgress, itemsOfTemplate, nextSetIndex, percent, workoutProgress } from '../lib/progress'
import { type SessionValue, type SyncState, useNow, useSession, useWakeLock } from '../lib/session'
import { daysOf, useCurrentProgram } from '../lib/programs'
import { useExerciseHistory, useTemplates, useWorkouts } from '../lib/storage'
import type { Exercise, SetValues, Template, TrackingType } from '../lib/types'
import { useStartWorkout } from '../lib/useStartWorkout'
import { useI18n } from '../locales'

// A workout day: the list of its exercises (`/day/:templateId` before starting, `/workout` while
// training) and one page per exercise (`…/:index`) — swipe left / right to the next / previous one.

/** Countdown before moving on once every set of an exercise is done. */
const AUTO_NEXT_MS = 5000

const SYNC_CLASS: Record<SyncState, string> = { saved: 'text-subtle', pending: 'text-subtle', saving: 'text-subtle', error: 'text-expense' }

/** Logs the next set of exercise `i` with `values` (adding a set when all are done), then ✓ it. */
function logSet(session: SessionValue, i: number, values: SetValues) {
  let j = -1
  session.update((w) => ({
    ...w,
    exercises: w.exercises.map((e, k) => {
      if (k !== i) return e
      j = nextSetIndex(e) ?? e.sets.length
      return {
        ...e,
        sets: j < e.sets.length ? e.sets.map((s, m) => (m === j ? { ...s, ...values } : s)) : [...e.sets, { reps: null, weight: null, seconds: null, distance: null, ...values, done: false }],
      }
    }),
  }))
  if (j >= 0) session.toggleSet(i, j)
}

/** Index of the set the stopwatch should time: the next one, added when all are done. */
function setForTimer(session: SessionValue, i: number): number {
  let j = -1
  session.update((w) => ({
    ...w,
    exercises: w.exercises.map((e, k) => {
      if (k !== i) return e
      j = nextSetIndex(e) ?? e.sets.length
      return j < e.sets.length ? e : { ...e, sets: [...e.sets, { reps: null, weight: null, seconds: e.sets.at(-1)?.seconds ?? null, distance: null, done: false }] }
    }),
  }))
  return j
}

/** A workout day and its place (index) in its program. */
function useTemplate(id: string | undefined) {
  const templates = useTemplates()
  const template = templates.data?.find((x) => x.id === id)
  const days = daysOf(templates.data, template?.programId)
  return { templates, template, index: days.findIndex((x) => x.id === id) }
}

// --- pages --------------------------------------------------------------------------------------

/** A workout day of the programme, before it is started. */
export function TemplateDay() {
  const { templateId } = useParams()
  const { t } = useI18n()
  const session = useSession()
  const { templates, template, index } = useTemplate(templateId)
  if (session.workout && session.workout.templateId === templateId) return <Navigate to="/workout" replace />
  if (templates.error) return <ApiNotice error={templates.error} onRetry={templates.reload} />
  if (!template) return templates.loading ? <Skeleton className="h-96" /> : <Empty action={<Link to="/" className="text-sm text-accent hover:underline">{t('dashboard.title')}</Link>}>{t('templates.notFound')}</Empty>
  return <TemplateDayView template={template} index={index} />
}

/** The exercises of a workout day with its Begin button; `extra` goes under the button. */
function TemplateDayView({ template, index, back, extra }: { template: Template; index: number; back?: string; extra?: ReactNode }) {
  const { t } = useI18n()
  const { byId } = useExercises()
  const start = useStartWorkout()
  const done = useWorkouts({ status: 'done', limit: 500 })
  const items = itemsOfTemplate(template, (id) => byId.get(id)?.trackingType, (id) => byId.get(id)?.name)
  const last = (done.data ?? []).find((w) => w.templateId === template.id)
  const begin = () => start({ name: template.name, templateId: template.id, items: template.items }, '/workout/0')

  return (
    <DayView
      back={back ?? (template.programId ? `/programs/${template.programId}` : '/')}
      title={template.name}
      label={t('day.number', { n: index + 1 })}
      color={template.color}
      items={items}
      base={`/day/${template.id}`}
      progress={0}
      meta={`~ ${formatEstimate(estimateSec(items), t)}`}
      sub={last ? t('day.lastTime', { pct: percent(workoutProgress(last)) }) : undefined}
      right={
        <Link to={`/templates/${template.id}`} aria-label={t('common.edit')} title={t('common.edit')} className="inline-grid size-10 place-items-center rounded-full border border-border bg-surface text-muted hover:text-fg">
          <IconEdit className="size-4" />
        </Link>
      }
      footer={
        <div className="grid gap-3">
          <Button variant="primary" className="w-full py-3.5 text-base font-semibold tracking-wide uppercase" disabled={!items.length} onClick={begin}>
            <IconPlay className="size-4" />
            {t('day.begin')}
          </Button>
          {extra}
        </div>
      }
    />
  )
}

/**
 * The workout being trained: progress per exercise and finish. The plan is not edited here; an
 * exercise can only be swapped for a similar one, for this workout only (the program stays as it
 * is). An empty workout (no program day) adds its exercises as it goes.
 */
export function LiveDay() {
  const { t } = useI18n()
  const { formatKg, formatNumber } = useFormat()
  const navigate = useNavigate()
  const session = useSession()
  const w = session.workout
  const { byId } = useExercises()
  const { template: tpl, index } = useTemplate(w?.templateId ?? undefined)
  const now = useNow(!!w, 1000)
  useWakeLock(!!w)
  const [picking, setPicking] = useState(false)
  const [swapping, setSwapping] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)
  if (!w) return <NoWorkout />

  const items: DayItem[] = w.exercises.map((e) => ({ ...e, name: byId.get(e.exerciseId)?.name ?? e.name }))
  const totals = workoutTotals(w)
  const allSets = w.exercises.reduce((n, e) => n + e.sets.length, 0)

  const finish = async () => {
    setBusy(true)
    setError(null)
    try {
      const done = await session.finish()
      navigate(`/history/${done.id}?done=1`)
    } catch (e) {
      setError(toApiError(e))
      setBusy(false)
    }
  }

  return (
    <>
      <DayView
        back="/"
        title={w.name}
        onRename={w.templateId ? undefined : (name) => session.update((x) => ({ ...x, name: name.slice(0, 100) }))}
        label={tpl ? t('day.number', { n: index + 1 }) : t('session.inProgress')}
        color={tpl?.color}
        items={items}
        base="/workout"
        live
        progress={workoutProgress(w)}
        meta={<span className="text-accent">{clock((now - new Date(w.startedAt).getTime()) / 1000)}</span>}
        sub={
          <>
            {totals.sets}/{allSets} {t('set.sets')}
            {totals.volumeKg > 0 && ` · ${formatKg(totals.volumeKg)}`} · <span className={SYNC_CLASS[session.sync]}>{t(`sync.${session.sync}`)}</span>
          </>
        }
        rowAction={(i) => (
          <IconButton label={w.exercises[i]?.sets.some((s) => s.done) ? t('swap.locked') : t('swap.title')} disabled={!!w.exercises[i]?.sets.some((s) => s.done)} onClick={() => setSwapping(i)}>
            <IconSwap className="size-4" />
          </IconButton>
        )}
        footer={
          <div className="grid gap-3">
            {!w.templateId && (
              <Button onClick={() => setPicking(true)} className="w-full py-3">
                <IconPlus className="size-4" />
                {t('plan.addExercise')}
              </Button>
            )}
            <Label text={t('workout.note')}>
              <textarea value={w.note} onChange={(e) => session.update((x) => ({ ...x, note: e.target.value.slice(0, 2000) }))} rows={2} className="field resize-none" placeholder={t('workout.notePlaceholder')} />
            </Label>
            {error && <ApiNotice error={error} />}
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <Button variant="danger" className="py-3.5" onClick={() => setConfirm('discard')} aria-label={t('workout.discard')} title={t('workout.discard')}>
                <IconTrash className="size-4" />
              </Button>
              <Button variant="primary" className="py-3.5 text-base font-semibold tracking-wide uppercase" disabled={busy} onClick={() => setConfirm('finish')}>
                <IconCheck className="size-4" />
                {t('workout.finish')}
              </Button>
            </div>
          </div>
        }
      />

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={(list) => session.update((x) => ({ ...x, exercises: [...x.exercises, ...list.map((e) => loggedExerciseFor(planItemFor(e), e))] }))} />
      {swapping != null && (
        <SwapSheet
          open
          onClose={() => setSwapping(null)}
          current={byId.get(w.exercises[swapping]?.exerciseId ?? '')}
          hint={t('swap.liveHint')}
          onPick={(e) => session.update((x) => ({ ...x, exercises: x.exercises.map((ex, k) => (k === swapping ? swapLoggedExercise(ex, e) : ex)) }))}
        />
      )}
      <Sheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === 'discard' ? t('workout.discard') : t('workout.finish')}
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
            <Button variant={confirm === 'discard' ? 'danger' : 'primary'} disabled={busy} onClick={() => (confirm === 'discard' ? void session.discard().then(() => navigate('/')) : void finish())}>
              {confirm === 'discard' ? t('workout.discard') : t('workout.finish')}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {confirm === 'discard'
            ? t('workout.discardConfirm')
            : totals.sets < allSets
              ? t('workout.finishUnfinished', { count: allSets - totals.sets })
              : t('workout.finishConfirm', { sets: totals.sets, volume: formatNumber(totals.volumeKg) })}
        </p>
      </Sheet>
    </>
  )
}

/** No workout running: the next workout day of the current program, ready to begin. */
function NoWorkout() {
  const { t } = useI18n()
  const active = useWorkouts({ status: 'active', limit: 5 })
  const done = useWorkouts({ status: 'done', limit: 500 })
  const session = useSession()
  const { days, programs, templates } = useCurrentProgram()
  const next = currentDay(days, done.data ?? [], todayIso(), null).day

  const unfinished = !!active.data?.length && (
    <Card title={t('workout.unfinished')}>
      <ul className="grid gap-2">
        {active.data.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {w.name || t('workout.untitled')} · <span className="text-muted">{w.date}</span>
            </span>
            <Button onClick={() => session.start(w)}>{t('session.continue')}</Button>
          </li>
        ))}
      </ul>
    </Card>
  )

  if ((programs.loading && !programs.data) || (templates.loading && !templates.data)) return <Skeleton className="h-96" />
  if (next)
    return (
      <TemplateDayView
        template={next}
        index={days.indexOf(next)}
        back="/"
        extra={unfinished}
      />
    )
  return (
    <div className="grid gap-4">
      <Empty
        action={
          <Link to="/programs" className="inline-flex items-center rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            {t('programs.title')}
          </Link>
        }
      >
        {t('workout.noDay')}
      </Empty>
      {unfinished}
    </div>
  )
}

/** One exercise of a programme day that has not been started: logging a set starts the workout. */
export function TemplateExercise() {
  const { templateId, index: raw } = useParams()
  const { t } = useI18n()
  const session = useSession()
  const { templates, template } = useTemplate(templateId)
  const { byId } = useExercises()
  const start = useStartWorkout()
  const i = Number(raw)
  if (session.workout && session.workout.templateId === templateId) return <Navigate to={`/workout/${raw}`} replace />
  if (!template) return templates.loading ? <Skeleton className="h-96" /> : <Navigate to="/" replace />
  const items = itemsOfTemplate(template, (id) => byId.get(id)?.trackingType, (id) => byId.get(id)?.name)
  if (!items[i]) return <Navigate to={`/day/${template.id}`} replace />

  // `logged`: the first set is logged on the way, so the live page still sees the exercise get done.
  const begin = (then?: () => void, logged = false) => {
    if (start({ name: template.name, templateId: template.id, items: template.items }, `/workout/${i}`, logged ? { logged: true } : undefined)) then?.()
  }
  // Swapping starts today's workout with the other exercise; the program itself is not changed.
  const swap = (e: Exercise) =>
    start({ name: template.name, templateId: template.id, items: template.items.map((it, k) => (k === i ? swapPlanItem(it, items[i]?.trackingType ?? 'reps_weight', e) : it)) }, `/workout/${i}`)
  return (
    <ExerciseScreen
      items={items}
      index={i}
      base={`/day/${template.id}`}
      dayTitle={template.name}
      right={
        <Button variant="primary" className="rounded-full px-4" onClick={() => begin()}>
          {t('day.beginShort')}
        </Button>
      }
      onLog={(values) => begin(() => logSet(session, i, values), true)}
      onSwap={swap}
      swapHint={t('swap.liveHint')}
      onStartTimer={() =>
        begin(() => {
          const j = setForTimer(session, i)
          session.startSetTimer(i, j)
        })
      }
    />
  )
}

/** One exercise of the workout in progress. */
export function LiveExercise() {
  const { index: raw } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const session = useSession()
  const w = session.workout
  const { byId } = useExercises()
  const { template: tpl } = useTemplate(w?.templateId ?? undefined)
  const now = useNow(!!w, 1000)
  useWakeLock(!!w)
  // While finishing, the session is already empty: wait for the summary page instead of redirecting.
  const [finishing, setFinishing] = useState(false)
  const i = Number(raw)
  if (!w) return finishing ? <Skeleton className="h-96" /> : <Navigate to="/workout" replace />
  const items: DayItem[] = w.exercises.map((e) => ({ ...e, name: byId.get(e.exerciseId)?.name ?? e.name }))
  if (!items[i]) return <Navigate to="/workout" replace />

  return (
    <ExerciseScreen
      items={items}
      index={i}
      base="/workout"
      dayTitle={w.name || tpl?.name || t('workout.untitled')}
      live={{
        session,
        workoutId: w.id,
        finish: async () => {
          setFinishing(true)
          try {
            const done = await session.finish()
            navigate(`/history/${done.id}?done=1`)
          } catch (e) {
            setFinishing(false)
            window.alert(toApiError(e).message)
          }
        },
      }}
      right={<span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-sm text-accent tabular-nums">{clock((now - new Date(w.startedAt).getTime()) / 1000)}</span>}
      onLog={(values) => logSet(session, i, values)}
      onSwap={items[i].sets.some((s) => s.done) ? undefined : (e) => session.update((x) => ({ ...x, exercises: x.exercises.map((ex, k) => (k === i ? swapLoggedExercise(ex, e) : ex)) }))}
      swapHint={t('swap.liveHint')}
      onStartTimer={() => session.startSetTimer(i, setForTimer(session, i))}
    />
  )
}

// --- shared views -------------------------------------------------------------------------------

function formatEstimate(sec: number, t: ReturnType<typeof useI18n>['t']) {
  const m = Math.max(1, Math.round(sec / 60))
  return m < 60 ? t('unit.minutes', { n: m }) : t('unit.hoursMinutes', { h: Math.floor(m / 60), m: String(m % 60).padStart(2, '0') })
}

/** Top bar of the day screens, under the app header. */
function ScreenBar({ back, title, right }: { back: string; title: ReactNode; right?: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="sticky top-[calc(71px+env(safe-area-inset-top))] z-10 lg:top-[calc(57px+env(safe-area-inset-top))] -mx-4 flex items-center gap-3 bg-bg/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <Link to={back} aria-label={t('common.back')} title={t('common.back')} className="inline-grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted hover:text-fg">
        <IconArrowLeft className="size-4" />
      </Link>
      <div className="min-w-0 flex-1 truncate text-center text-base font-semibold">{title}</div>
      <div className="flex min-w-10 shrink-0 justify-end">{right}</div>
    </div>
  )
}

function DayView({
  back,
  title,
  onRename,
  label,
  color,
  items,
  base,
  live,
  progress,
  meta,
  sub,
  right,
  rowAction,
  footer,
}: {
  back: string
  title: string
  onRename?: (name: string) => void
  label: string
  color?: string
  items: DayItem[]
  base: string
  live?: boolean
  progress: number
  meta: ReactNode
  sub?: ReactNode
  right?: ReactNode
  rowAction?: (i: number) => ReactNode
  footer: ReactNode
}) {
  const { t } = useI18n()
  const { formatPlan } = useFormat()
  const { byId } = useExercises()
  const c = color ? colorOf(color) : null

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <ScreenBar back={back} title={t('day.exercises')} right={right} />

      <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <Ring value={progress} className="size-20" strokeWidth={8}>
          <span className="text-base font-semibold tabular-nums">{percent(progress)}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('truncate font-mono text-[11px] tracking-wider uppercase', c ? c.text : 'text-muted')}>{label}</span>
            <span className="shrink-0 font-mono text-sm text-muted tabular-nums">{meta}</span>
          </div>
          {onRename ? (
            <input
              value={title}
              onChange={(e) => onRename(e.target.value)}
              placeholder={t('workout.untitled')}
              aria-label={t('workout.name')}
              className="w-full truncate bg-transparent text-xl font-semibold tracking-tight outline-none placeholder:text-subtle"
            />
          ) : (
            <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          )}
          {sub && <div className="mt-0.5 truncate font-mono text-xs text-muted tabular-nums">{sub}</div>}
        </div>
      </section>

      {!items.length ? (
        <Empty>{live ? t('workout.empty') : t('plan.noExercises')}</Empty>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
          {items.map((it, i) => {
            const ex = byId.get(it.exerciseId)
            const p = itemProgress(it)
            return (
              <li key={`${it.exerciseId}-${i}`} className="flex items-center gap-1">
                <Link to={`${base}/${i}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface">
                  <ExerciseImage exercise={ex} className="size-16 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm leading-snug font-medium">{it.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-xs text-muted tabular-nums">{formatPlan(it.sets, it.trackingType)}</span>
                  </span>
                  {live && (
                    <span className={cn('shrink-0 font-mono text-sm tabular-nums', p >= 1 ? 'text-income' : p > 0 ? 'text-accent' : 'text-subtle')}>
                      {p >= 1 ? <IconCheck className="size-5" /> : `${percent(p)}%`}
                    </span>
                  )}
                  <IconChevronRight className="size-4 shrink-0 text-subtle" />
                </Link>
                {rowAction?.(i)}
              </li>
            )
          })}
        </ul>
      )}

      {footer}
    </div>
  )
}

/** Values to suggest for the next set: its target, else what was just done, else last session. */
function suggestion(item: DayItem, previous: SetValues[] | undefined): SetValues {
  const j = nextSetIndex(item) ?? item.sets.length
  const target = item.sets[j]
  const lastDone = [...item.sets].reverse().find((s) => s.done)
  const prev = previous?.[j] ?? previous?.at(-1)
  const pick = (k: keyof SetValues) => target?.[k] ?? lastDone?.[k] ?? prev?.[k] ?? null
  return { reps: pick('reps'), weight: pick('weight'), seconds: pick('seconds'), distance: pick('distance') }
}

function ExerciseScreen({
  items,
  index,
  base,
  dayTitle,
  live,
  right,
  onLog,
  onSwap,
  swapHint,
  onStartTimer,
}: {
  items: DayItem[]
  index: number
  base: string
  dayTitle: string
  live?: { session: SessionValue; workoutId: string; finish: () => Promise<void> }
  right?: ReactNode
  onLog: (values: SetValues) => void
  /** Swaps in a similar exercise; undefined = not allowed now (sets already done). */
  onSwap?: (e: Exercise) => void
  swapHint: string
  onStartTimer: () => void
}) {
  const { t } = useI18n()
  const { formatSet, formatSeconds, formatDayHeader, muscleName } = useFormat()
  const navigate = useNavigate()
  const location = useLocation()
  const { byId } = useExercises()
  const session = useSession()
  const item = items[index] as DayItem
  const ex = byId.get(item.exerciseId)
  const type = item.trackingType
  const history = useExerciseHistory(item.exerciseId, 20)
  const sessions = (history.data?.sessions ?? []).filter((s) => s.workoutId !== live?.workoutId)
  const [showAll, setShowAll] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [swapping, setSwapping] = useState(false)

  const rest = live ? session.rest : null
  const timer = session.setTimer && live && session.setTimer.exercise === index ? session.setTimer : null
  const now = useNow(!!rest || !!timer, 200)
  const doneCount = item.sets.filter((s) => s.done).length
  const next = nextSetIndex(item)
  const target = item.sets[next ?? item.sets.length - 1]
  const dir = (location.state as { dir?: number } | null)?.dir ?? 0

  // All sets of this exercise just got done: count down, then open the next unfinished exercise,
  // or finish the workout when nothing is left. Only on the transition, not when opening a page
  // that was already complete; undoing a set or "Stay" cancels it.
  const complete = !!live && item.sets.length > 0 && doneCount >= item.sets.length
  const following = items.map((_, k) => (index + 1 + k) % items.length).find((k) => k !== index && itemProgress(items[k] as DayItem) < 1)
  const [auto, setAuto] = useState<{ index: number; endsAt: number } | null>(null)
  const seen = useRef({ index, complete: complete && !(location.state as { logged?: boolean } | null)?.logged })
  useEffect(() => {
    const before = seen.current
    seen.current = { index, complete }
    if (before.index === index && complete && !before.complete) setAuto({ index, endsAt: Date.now() + AUTO_NEXT_MS })
    if (!complete || before.index !== index) setAuto(null)
  }, [index, complete])
  const autoNow = useNow(!!auto, 200)
  const autoLeft = auto ? Math.max(0, auto.endsAt - autoNow) : 0
  const advance = () => {
    setAuto(null)
    if (following != null) navigate(`${base}/${following}`, { replace: true, state: { dir: following > index ? 1 : -1 } })
    else void live?.finish()
  }
  const advanceRef = useRef(advance)
  useEffect(() => {
    advanceRef.current = advance
  })
  useEffect(() => {
    if (!auto) return
    const id = setTimeout(() => advanceRef.current(), Math.max(0, auto.endsAt - Date.now()))
    return () => clearTimeout(id)
  }, [auto])

  const go = (delta: number) => {
    const to = index + delta
    if (to >= 0 && to < items.length) navigate(`${base}/${to}`, { replace: true, state: { dir: delta } })
  }

  // Swipe left / right (not when the gesture starts in a field), arrow keys on a keyboard.
  // The page follows the finger once the gesture is clearly horizontal (`touch-pan-y` leaves
  // vertical scrolling to the browser); past 70px it moves to the neighbour.
  const touch = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null)
  const [drag, setDrag] = useState(0)
  const goRef = useRef(go)
  useEffect(() => {
    goRef.current = go
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, dialog')) return
      if (e.key === 'ArrowRight') goRef.current(1)
      if (e.key === 'ArrowLeft') goRef.current(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const targetValue = () => {
    if (!target) return '—'
    if (type === 'time') return target.seconds ? formatSeconds(target.seconds) : '—'
    if (type === 'distance_time') return target.seconds ? String(Math.round(target.seconds / 60)) : target.distance ? `${target.distance}` : '—'
    return target.reps ?? '—'
  }
  const timerElapsed = timer ? Math.floor((now - timer.startedAt) / 1000) : 0
  const restLeft = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0

  return (
    <div
      className="mx-auto grid w-full max-w-2xl touch-pan-y gap-4"
      onTouchStart={(e) => {
        const p = e.touches[0]
        touch.current = p && !(e.target as HTMLElement).closest('input, textarea, dialog') ? { x: p.clientX, y: p.clientY, axis: null } : null
      }}
      onTouchMove={(e) => {
        const s = touch.current
        const p = e.touches[0]
        if (!s || !p) return
        const dx = p.clientX - s.x
        const dy = p.clientY - s.y
        if (!s.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        if (s.axis !== 'x') return
        const edge = (dx > 0 && index === 0) || (dx < 0 && index === items.length - 1)
        setDrag(edge ? dx / 4 : dx)
      }}
      onTouchEnd={(e) => {
        const s = touch.current
        const p = e.changedTouches[0]
        touch.current = null
        setDrag(0)
        if (!s || !p || s.axis !== 'x') return
        const dx = p.clientX - s.x
        if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1)
      }}
      onTouchCancel={() => {
        touch.current = null
        setDrag(0)
      }}
    >
      <ScreenBar
        back={base}
        title={
          <>
            <span className="text-muted tabular-nums">
              {index + 1}/{items.length}
            </span>{' '}
            {dayTitle}
          </>
        }
        right={right}
      />

      <div
        key={index}
        style={drag ? { transform: `translateX(${drag}px)`, opacity: 1 - Math.min(0.5, Math.abs(drag) / 500) } : undefined}
        className={cn('grid gap-4', !drag && 'transition-[transform,opacity] duration-200', dir > 0 && 'animate-[dagym-from-right_220ms_ease-out]', dir < 0 && 'animate-[dagym-from-left_220ms_ease-out]')}
      >
        <div className="relative">
          <ExerciseImage exercise={ex} animate className="aspect-[4/3] max-h-80 w-full rounded-2xl border border-border sm:aspect-[16/9]" />
          {index > 0 && (
            <button type="button" onClick={() => go(-1)} aria-label={t('common.previous')} className="absolute top-1/2 left-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60">
              <IconChevronLeft className="size-5" />
            </button>
          )}
          {index < items.length - 1 && (
            <button type="button" onClick={() => go(1)} aria-label={t('common.next')} className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60">
              <IconChevronRight className="size-5" />
            </button>
          )}
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {items.map((it, k) => (
              <button
                key={k}
                type="button"
                aria-label={it.name}
                onClick={() => go(k - index)}
                className={cn('h-1.5 rounded-full transition-all', k === index ? 'w-5 bg-accent' : itemProgress(it) >= 1 ? 'w-1.5 bg-income/80' : 'w-1.5 bg-white/70 shadow')}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <Link to={`/exercises/${encodeURIComponent(item.exerciseId)}`} className="min-w-0 text-2xl leading-tight font-semibold tracking-tight hover:text-accent">
              {item.name}
            </Link>
            <button
              type="button"
              disabled={!onSwap}
              onClick={() => setSwapping(true)}
              title={onSwap ? t('swap.title') : t('swap.locked')}
              className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-muted transition-colors enabled:hover:border-accent enabled:hover:text-fg disabled:opacity-40"
            >
              <IconSwap className="size-3.5" />
              {t('swap.button')}
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">
            {target ? (
              <>
                {t('ex.target')}: <span className="font-semibold text-fg">{formatSet(target, type)}</span>
              </>
            ) : (
              muscleName(ex?.primaryMuscles[0] ?? '')
            )}
          </p>
          {item.note && !noteOpen && <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">{item.note}</p>}
        </div>

        <div className="grid grid-cols-3 justify-items-center gap-2">
          <div className="grid justify-items-center gap-1.5">
            {timer ? (
              <Ring value={timer.targetSec ? timerElapsed / timer.targetSec : 1} className="size-24 sm:size-28">
                <span className="font-mono text-xl font-semibold text-accent tabular-nums">{clock(timer.targetSec ? timer.targetSec - timerElapsed : timerElapsed)}</span>
              </Ring>
            ) : (
              <Ring value={target ? 1 : 0} tone="accent" className="size-24 sm:size-28">
                <span className="text-2xl font-semibold tabular-nums">{targetValue()}</span>
              </Ring>
            )}
            <span className="text-center text-xs text-muted">{timer ? t('ex.timing') : type === 'time' ? t('ex.targetTime') : type === 'distance_time' ? t('ex.targetMinutes') : t('ex.targetReps')}</span>
          </div>

          <div className="grid justify-items-center gap-1.5">
            <button type="button" disabled={!rest} onClick={session.skipRest} aria-label={rest ? t('rest.skip') : t('rest.title')} className="rounded-full">
              <Ring value={rest ? restLeft / rest.totalSec : 0} tone={rest && restLeft <= 0 ? 'accent' : 'warn'} className={cn('size-24 sm:size-28', !rest && 'opacity-80')}>
                {rest ? (
                  <span className={cn('font-mono text-xl font-semibold tabular-nums', restLeft <= 0 && 'text-income')}>{clock(Math.ceil(restLeft))}</span>
                ) : (
                  <IconLock className="size-7 text-cat-1" />
                )}
              </Ring>
            </button>
            {rest ? (
              <span className="flex gap-1">
                <button type="button" onClick={() => session.adjustRest(-15)} className="rounded-md border border-border-strong px-1.5 py-0.5 font-mono text-[11px] hover:bg-surface-2">
                  −15
                </button>
                <button type="button" onClick={() => session.adjustRest(15)} className="rounded-md border border-border-strong px-1.5 py-0.5 font-mono text-[11px] hover:bg-surface-2">
                  +15
                </button>
              </span>
            ) : (
              <span className="text-center text-xs text-muted">
                {t('rest.title')}
                {item.restSec ? ` · ${formatSeconds(item.restSec)}` : ''}
              </span>
            )}
          </div>

          <div className="grid justify-items-center gap-1.5">
            <Ring value={item.sets.length ? doneCount / item.sets.length : 0} tone={doneCount && doneCount >= item.sets.length ? 'accent' : 'warn'} className="size-24 sm:size-28">
              <span className="text-2xl font-semibold tabular-nums">
                {doneCount}/{item.sets.length}
              </span>
            </Ring>
            <span className="text-center text-xs text-muted">{t('ex.setsDone')}</span>
          </div>
        </div>

        <LogForm key={`${index}-${doneCount}-${item.sets.length}`} type={type} initial={suggestion(item, sessions[0]?.sets)} onLog={onLog} timing={!!timer} onStartTimer={onStartTimer} onStopTimer={session.stopSetTimer} />

        {live && (
          <div>
            {noteOpen ? (
              <Label text={t('block.note')}>
                <textarea
                  autoFocus
                  value={item.note}
                  onChange={(e) => live.session.update((w) => ({ ...w, exercises: w.exercises.map((x, k) => (k === index ? { ...x, note: e.target.value.slice(0, 500) } : x)) }))}
                  onBlur={() => setNoteOpen(false)}
                  rows={2}
                  className="field resize-none"
                  placeholder={t('block.notePlaceholder')}
                />
              </Label>
            ) : (
              <button type="button" onClick={() => setNoteOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                <IconNote className="size-4" />
                {item.note ? t('ex.editNote') : t('ex.addNote')}
              </button>
            )}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <header className="border-b border-border bg-surface-2/60 px-4 py-2.5 text-sm font-semibold">{live ? t('ex.thisWorkout') : t('ex.plan')}</header>
          <ol className="divide-y divide-border">
            {item.sets.map((s, j) => (
              <li key={j} className={cn('flex items-center gap-3 px-4 py-2.5 text-sm', !s.done && 'text-subtle')}>
                <span className="w-7 font-mono text-xs text-accent">#{j + 1}</span>
                <span className="flex-1 font-mono tabular-nums">{formatSet(s, type)}</span>
                {live && s.done && (
                  <>
                    <IconCheck className="size-4 text-income" />
                    <button type="button" onClick={() => live.session.toggleSet(index, j)} aria-label={t('ex.undo', { n: j + 1 })} title={t('ex.undo', { n: j + 1 })} className="grid size-7 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-expense">
                      <IconX className="size-3.5" />
                    </button>
                  </>
                )}
                {live && !s.done && j === next && <span className="text-[11px] tracking-wider text-accent uppercase">{t('ex.next')}</span>}
              </li>
            ))}
          </ol>
        </section>

        {auto && (
          <div role="status" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto mx-auto w-full max-w-xl px-3">
              <div className="relative overflow-hidden rounded-2xl border border-accent/60 bg-surface-2 shadow-2xl shadow-black/50">
                <div aria-hidden="true" className="absolute inset-y-0 left-0 bg-accent/20 transition-[width] duration-200 ease-linear" style={{ width: `${100 - (autoLeft / AUTO_NEXT_MS) * 100}%` }} />
                <div className="relative flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-mono text-lg font-semibold text-accent-fg tabular-nums">{Math.ceil(autoLeft / 1000)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] tracking-wider text-accent uppercase">{following != null ? t('auto.exerciseDone') : t('auto.workoutDone')}</div>
                    <div className="truncate text-sm font-semibold">{following != null ? t('auto.next', { name: items[following]?.name ?? '' }) : t('auto.finishing')}</div>
                  </div>
                  <button type="button" onClick={() => setAuto(null)} className="rounded-lg border border-border-strong px-2.5 py-2 text-xs hover:bg-surface">
                    {t('auto.stay')}
                  </button>
                  <button type="button" onClick={advance} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-fg hover:opacity-90">
                    {following != null ? t('auto.go') : t('workout.finish')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {onSwap && swapping && <SwapSheet open onClose={() => setSwapping(false)} current={ex} onPick={onSwap} hint={swapHint} />}

        <section className="grid gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t('ex.history')}</h2>
            <Link to={`/exercises/${encodeURIComponent(item.exerciseId)}`} className="inline-flex items-center gap-0.5 text-sm text-accent hover:underline">
              {t('ex.chart')}
              <IconChevronRight className="size-4" />
            </Link>
          </div>
          {history.loading && !history.data ? (
            <Skeleton className="h-28" />
          ) : !sessions.length ? (
            <p className="rounded-2xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted">{t('ex.noHistory')}</p>
          ) : (
            <>
              {(showAll ? sessions : sessions.slice(0, 3)).map((s) => (
                <Link key={s.workoutId} to={`/history/${s.workoutId}`} className="block overflow-hidden rounded-2xl border border-border bg-surface hover:border-border-strong">
                  <div className="bg-surface-2/60 px-4 py-2 text-sm font-semibold">{formatDayHeader(s.date)}</div>
                  <ol className="divide-y divide-border">
                    {s.sets.map((x, j) => (
                      <li key={j} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <span className="w-7 font-mono text-xs text-accent">#{j + 1}</span>
                        <span className="flex-1 font-mono tabular-nums">{formatSet(x, type)}</span>
                      </li>
                    ))}
                  </ol>
                </Link>
              ))}
              {sessions.length > 3 && !showAll && (
                <Button variant="plain" onClick={() => setShowAll(true)}>
                  {t('common.showMore', { count: sessions.length - 3 })}
                </Button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/** Value fields + "+" that logs the next set. Time sets also get a stopwatch. */
function LogForm({ type, initial, onLog, timing, onStartTimer, onStopTimer }: { type: TrackingType; initial: SetValues; onLog: (v: SetValues) => void; timing: boolean; onStartTimer: () => void; onStopTimer: () => void }) {
  const { t } = useI18n()
  const [v, setV] = useState<SetValues>(initial)
  const cls = 'h-12 text-lg font-semibold'
  const minutes = v.seconds == null ? null : Math.round((v.seconds / 60) * 10) / 10
  const ready = type === 'reps_weight' || type === 'reps' ? !!v.reps : type === 'time' ? !!v.seconds : !!(v.distance || v.seconds)

  return (
    <div className="flex items-end gap-2 rounded-2xl bg-surface-2/60 p-2">
      {type === 'reps_weight' && (
        <Field label={t('set.kg')}>
          <NumberInput label={t('set.weight')} value={v.weight} onChange={(weight) => setV({ ...v, weight })} className={cls} max={10_000} placeholder="0" />
        </Field>
      )}
      {(type === 'reps_weight' || type === 'reps') && (
        <Field label={t('set.reps')}>
          <NumberInput label={t('set.reps')} value={v.reps} onChange={(reps) => setV({ ...v, reps })} className={cls} integer max={1000} placeholder="0" />
        </Field>
      )}
      {type === 'time' && (
        <Field label={t('set.seconds')}>
          <NumberInput label={t('set.seconds')} value={v.seconds} onChange={(seconds) => setV({ ...v, seconds })} className={cls} integer max={86_400} placeholder="0" />
        </Field>
      )}
      {type === 'distance_time' && (
        <>
          <Field label={t('set.km')}>
            <NumberInput label={t('set.distance')} value={v.distance} onChange={(distance) => setV({ ...v, distance })} className={cls} max={10_000} placeholder="0" />
          </Field>
          <Field label={t('set.minutes')}>
            <NumberInput label={t('set.minutes')} value={minutes} onChange={(m) => setV({ ...v, seconds: m == null ? null : Math.round(m * 60) })} className={cls} max={1440} placeholder="0" />
          </Field>
        </>
      )}
      {type === 'time' && (
        <button
          type="button"
          onClick={timing ? onStopTimer : onStartTimer}
          aria-label={timing ? t('set.stopTimer') : t('set.startTimer')}
          title={timing ? t('set.stopTimer') : t('set.startTimer')}
          className={cn('grid size-12 shrink-0 place-items-center rounded-xl border transition-colors', timing ? 'border-accent bg-accent/15 text-accent' : 'border-border-strong text-fg hover:bg-surface-2')}
        >
          {timing ? <IconStop className="size-5" /> : <IconPlay className="size-5" />}
        </button>
      )}
      <button
        type="button"
        disabled={!ready || timing}
        onClick={() => onLog(v)}
        aria-label={t('ex.logSet')}
        title={t('ex.logSet')}
        className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <IconPlus className="size-6" />
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 flex-1 gap-1">
      <span className="px-1 font-mono text-[10px] tracking-wider text-subtle uppercase">{label}</span>
      {children}
    </label>
  )
}
