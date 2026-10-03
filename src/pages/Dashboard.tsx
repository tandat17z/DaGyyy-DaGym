import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiNotice } from '../components/ApiNotice'
import { IconChevronLeft, IconChevronRight, IconPlus } from '../components/icons'
import { Ring } from '../components/Ring'
import { WorkoutRow } from '../components/WorkoutRow'
import { Button, Card, IconButton, Sheet, Skeleton } from '../components/ui'
import { colorOf } from '../config/colors'
import { cn } from '../lib/cn'
import { addDays, addMonths, endOfMonth, startOfMonth, startOfWeek, todayIso } from '../lib/date'
import { clock, useFormat } from '../lib/format'
import { currentDay, lastByTemplate, percent, workoutProgress } from '../lib/progress'
import { useNow, useSession } from '../lib/session'
import { useCurrentProgram } from '../lib/programs'
import { useWorkouts } from '../lib/storage'
import type { Template, Workout } from '../lib/types'
import { useI18n } from '../locales'

/** Overview: the workout in progress, the programme (next workout day first), the training calendar. */
export function Dashboard() {
  const { t } = useI18n()
  const { formatDayHeader, formatKg, formatDuration } = useFormat()
  const today = todayIso()
  const weekFrom = startOfWeek(today)
  const { programs, templates, current, days, setCurrent } = useCurrentProgram()
  const done = useWorkouts({ status: 'done', limit: 500 })
  const session = useSession()

  const list = days
  const workouts = done.data ?? []
  const inProgram = new Set(days.map((d) => d.id))
  const last = lastByTemplate(workouts)
  // Up next: the day to train now (see currentDay), then the following days of the program —
  // at most 3, nothing already behind.
  const now = currentDay(list, workouts, today, session.workout)
  const todayId = now.today ? now.day?.id : undefined
  const from = Math.max(0, list.findIndex((d) => d.id === now.day?.id))
  const upcoming = list.length ? Array.from({ length: Math.min(3, list.length) }, (_, k) => (from + k) % list.length) : []
  const week = workouts.filter((w) => w.date >= weekFrom)
  const loading = (programs.loading && !programs.data) || (templates.loading && !templates.data) || (done.loading && !done.data)
  const error = programs.error ?? templates.error ?? done.error

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('dashboard.title')}</h1>
          <p className="mt-0.5 text-sm text-muted">{formatDayHeader(today)}</p>
        </div>
      </div>
      {error && <ApiNotice error={error} onRetry={() => [programs, templates, done].forEach((r) => r.reload())} />}

      {session.workout && <LiveCard workout={session.workout} />}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <section className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/20 via-surface to-surface p-5">
            <div className="font-mono text-[11px] tracking-wider text-accent uppercase">{t('dashboard.program')}</div>
            {(programs.data?.length ?? 0) > 1 ? (
              <select value={current?.id ?? ''} onChange={(e) => setCurrent(e.target.value)} aria-label={t('dashboard.switchProgram')} className="-ml-1 mt-0.5 w-full max-w-full truncate rounded-md bg-transparent px-1 py-0.5 text-xl font-semibold tracking-tight outline-none hover:bg-surface-2/60">
                {programs.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-0.5 truncate text-xl font-semibold tracking-tight">{current?.name ?? '—'}</div>
            )}
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold tracking-tight tabular-nums">{loading ? '–' : workouts.filter((w) => w.templateId && inProgram.has(w.templateId)).length}</div>
                <div className="text-sm text-muted">{t('dashboard.workoutsDone')}</div>
              </div>
              <div className="text-right text-sm text-muted">
                <div className="font-mono text-[11px] tracking-wider text-subtle uppercase">{t('dashboard.thisWeek')}</div>
                <div className="mt-0.5 tabular-nums">
                  <span className="font-semibold text-fg">{week.length}</span> · {formatDuration(week.reduce((n, w) => n + w.durationSec, 0))}
                </div>
                <div className="tabular-nums">{formatKg(Math.round(week.reduce((n, w) => n + (w.volumeKg ?? 0), 0)))}</div>
              </div>
            </div>
          </section>

          <Card
            title={t('dashboard.next')}
            action={
              <Link to={current ? `/programs/${current.id}` : '/programs'} className="text-xs text-muted hover:text-fg">
                {t('dashboard.manage')}
              </Link>
            }
          >
            {loading ? (
              <div className="grid gap-2">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : !list.length ? (
              <div className="grid justify-items-start gap-3 text-sm text-muted">
                <p>{t('dashboard.noProgram')}</p>
                <Link to={current ? `/templates/new?program=${current.id}` : '/programs'} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
                  <IconPlus className="size-4" />
                  {current ? t('templates.new') : t('programs.new')}
                </Link>
              </div>
            ) : (
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
                {upcoming.map((i) => list[i]).filter((tpl) => !!tpl).map((tpl, k) => (
                  <li key={tpl.id}>
                    <DayCard template={tpl} index={list.indexOf(tpl)} last={session.workout?.templateId === tpl.id ? session.workout : last.get(tpl.id)} isNext={k === 0}
                      isToday={tpl.id === todayId} live={session.workout?.templateId === tpl.id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <TrainingCalendar templates={templates.data ?? []} />
          <Card title={t('today.recent')} action={<Link to="/history" className="text-xs text-muted hover:text-fg">{t('common.seeAll')}</Link>}>
            {loading ? (
              <Skeleton className="h-24" />
            ) : workouts.length ? (
              <ul className="-mx-2 grid">
                {workouts.slice(0, 4).map((w) => (
                  <li key={w.id}>
                    <WorkoutRow workout={w} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t('history.empty')}</p>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

function LiveCard({ workout }: { workout: Workout }) {
  const { t } = useI18n()
  const now = useNow(true, 1000)
  const p = workoutProgress(workout)
  return (
    <Link to="/workout" className="flex items-center gap-4 rounded-2xl border border-accent/60 bg-accent/10 p-4 hover:border-accent">
      <Ring value={p} className="size-14" strokeWidth={9}>
        <span className="text-sm font-semibold tabular-nums">{percent(p)}%</span>
      </Ring>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[11px] tracking-wider text-accent uppercase">{t('session.inProgress')}</span>
        <span className="block truncate text-lg font-semibold">{workout.name || t('workout.untitled')}</span>
        <span className="font-mono text-xs text-muted tabular-nums">{clock((now - new Date(workout.startedAt).getTime()) / 1000)}</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg">
        {t('session.continue')}
        <IconChevronRight className="size-4" />
      </span>
    </Link>
  )
}

/** One workout day of the programme with the progress of its latest session. */
function DayCard({ template, index, last, isNext, isToday, live }: { template: Template; index: number; last: Workout | undefined; isNext: boolean; isToday: boolean; live: boolean }) {
  const { t } = useI18n()
  const { formatDayShort } = useFormat()
  const c = colorOf(template.color)
  const p = last ? workoutProgress(last) : 0
  return (
    <Link
      to={live ? '/workout' : `/day/${template.id}`}
      className={cn('flex items-center gap-4 rounded-xl border bg-surface-2/40 p-3 transition-colors hover:border-border-strong', isNext ? 'border-accent/50' : 'border-border')}
    >
      <Ring value={p} className="size-16" strokeWidth={8}>
        <span className="text-sm font-semibold tabular-nums">{percent(p)}%</span>
      </Ring>
      <span className="min-w-0 flex-1">
        <span className={cn('block font-mono text-[11px] tracking-wider uppercase', c.text)}>{t('day.number', { n: index + 1 })}</span>
        <span className="block truncate text-base font-semibold">{template.name}</span>
        <span className="block truncate text-xs text-subtle">
          {live ? t('session.inProgress') : last ? t('dashboard.lastTime', { date: formatDayShort(last.date) }) : t('dashboard.notYet')}
        </span>
      </span>
      {isNext && !live && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">{isToday ? t('common.today') : t('dashboard.upNext')}</span>}
      {live && <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-accent" />}
      <IconChevronRight className="size-4 shrink-0 text-subtle" />
    </Link>
  )
}

/** Month grid of what was actually trained: each workout on its date with its progress. */
function TrainingCalendar({ templates }: { templates: Template[] }) {
  const { t } = useI18n()
  const { formatMonth, weekdayShort, formatDayHeader } = useFormat()
  const navigate = useNavigate()
  const session = useSession()
  const today = todayIso()
  const [month, setMonth] = useState(() => startOfMonth(today))
  const [picked, setPicked] = useState<string | null>(null)
  const from = startOfWeek(month)
  const to = addDays(startOfWeek(endOfMonth(month)), 6)
  const res = useWorkouts({ from, to, limit: 500 })
  const byTemplate = new Map(templates.map((x) => [x.id, x]))

  // The live workout as it is on this device (the API copy may be a few seconds behind or missing).
  const live = session.workout
  const list = (res.data ?? []).filter((w) => w.id !== live?.id)
  if (live && live.date >= from && live.date <= to) list.push(live)
  const onDay = (d: string) => list.filter((w) => w.date === d)
  const open = (w: Workout) => navigate(w.id === live?.id ? '/workout' : `/history/${w.id}`)

  const cells: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) cells.push(d)

  return (
    <Card
      title={formatMonth(month)}
      action={
        <div className="flex items-center gap-1">
          <IconButton label={t('common.previous')} onClick={() => setMonth(addMonths(month, -1))}>
            <IconChevronLeft />
          </IconButton>
          <Button variant="plain" className="px-2 py-1 text-xs" onClick={() => setMonth(startOfMonth(today))}>
            {t('common.today')}
          </Button>
          <IconButton label={t('common.next')} onClick={() => setMonth(addMonths(month, 1))}>
            <IconChevronRight />
          </IconButton>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-subtle uppercase">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>{weekdayShort(i)}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const ws = onDay(d)
          const inMonth = d.slice(0, 7) === month.slice(0, 7)
          return (
            <button
              key={d}
              type="button"
              disabled={!ws.length}
              onClick={() => (ws.length === 1 && ws[0] ? open(ws[0]) : setPicked(d))}
              className={cn(
                'grid min-h-16 min-w-0 content-start justify-items-center gap-1 rounded-lg px-0.5 py-1 transition-colors enabled:hover:bg-surface-2',
                !inMonth && 'opacity-35',
                d === today && 'bg-accent/5 ring-1 ring-accent/50',
              )}
            >
              <span className={cn('text-sm tabular-nums', d === today ? 'font-semibold text-accent' : d > today ? 'text-subtle' : 'text-fg')}>{Number(d.slice(8))}</span>
              {ws.slice(0, 2).map((w) => {
                const c = w.templateId ? colorOf(byTemplate.get(w.templateId)?.color) : null
                return (
                  <span key={w.id} className="grid w-full min-w-0 justify-items-center gap-0.5">
                    <span className={cn('max-w-full truncate rounded-full px-1 py-px font-mono text-[10px] font-semibold tabular-nums sm:px-1.5', c ? `${c.soft} ${c.text}` : 'bg-surface-2 text-muted', w.status === 'active' && 'animate-pulse')}>
                      {percent(workoutProgress(w))}%
                    </span>
                    <span className="w-full truncate text-[10px] leading-tight text-muted">{w.name || t('workout.untitled')}</span>
                  </span>
                )
              })}
            </button>
          )
        })}
      </div>
      {res.error && !res.error.needsLogin && <p className="mt-2 text-xs text-expense">{res.error.message}</p>}

      <Sheet open={!!picked} onClose={() => setPicked(null)} title={picked ? formatDayHeader(picked) : ''}>
        <ul className="grid gap-1.5">
          {(picked ? onDay(picked) : []).map((w) => (
            <li key={w.id}>
              <button type="button" onClick={() => open(w)} className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm hover:border-border-strong">
                <span className="min-w-0 flex-1 truncate">{w.name || t('workout.untitled')}</span>
                <span className="font-mono text-xs text-muted tabular-nums">{percent(workoutProgress(w))}%</span>
                <IconChevronRight className="size-4 text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </Card>
  )
}
