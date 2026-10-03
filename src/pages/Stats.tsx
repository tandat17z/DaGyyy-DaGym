import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiNotice } from '../components/ApiNotice'
import { type Bar, BarChart, HeatCalendar, RankBars } from '../components/charts'
import { IconChevronLeft, IconChevronRight, IconFlame } from '../components/icons'
import { SectionHeader } from '../components/Layout'
import { MuscleMap } from '../components/MuscleMap'
import { Card, IconButton, Tabs, StatTile } from '../components/ui'
import { addDays, addMonths, eachDay, type PeriodUnit, periodRange, shiftPeriod, startOfWeek, todayIso } from '../lib/date'
import { useExercises } from '../lib/exercises'
import { useFormat } from '../lib/format'
import { useStats } from '../lib/storage'
import type { StatsDay } from '../lib/types'
import { useI18n } from '../locales'

type Metric = 'volumeKg' | 'sets' | 'durationSec' | 'workouts'

/** Consecutive weeks (ending this week, or last week if this one is still empty) with a workout. */
function weekStreak(days: Map<string, StatsDay>): number {
  const today = todayIso()
  let week = startOfWeek(today)
  const has = (from: string) => Array.from({ length: 7 }, (_, i) => addDays(from, i)).some((d) => (days.get(d)?.workouts ?? 0) > 0)
  if (!has(week)) week = addDays(week, -7)
  let n = 0
  while (has(week)) {
    n++
    week = addDays(week, -7)
  }
  return n
}

export function Stats() {
  const { t } = useI18n()
  const { formatKg, formatDuration, formatNumber, formatDayShort, formatMonthShort, formatMonth, weekdayShort, muscleName } = useFormat()
  const { byId } = useExercises()
  const [unit, setUnit] = useState<PeriodUnit>('week')
  const [anchor, setAnchor] = useState(todayIso)
  const [metric, setMetric] = useState<Metric>('volumeKg')
  const [from, to] = periodRange(unit, anchor)
  const [prevFrom, prevTo] = periodRange(unit, shiftPeriod(unit, anchor, -1))
  const stats = useStats(from, to)
  const prev = useStats(prevFrom, prevTo)
  // Last ~year for the calendar and the streak.
  const yearFrom = addDays(startOfWeek(todayIso()), -7 * 52)
  const year = useStats(yearFrom, todayIso())

  const s = stats.data
  const totals = s?.totals
  const byDate = new Map((s?.byDay ?? []).map((d) => [d.date, d]))
  const yearDays = new Map((year.data?.byDay ?? []).map((d) => [d.date, d]))

  const fmt = (m: Metric, v: number) => (m === 'volumeKg' ? formatKg(Math.round(v)) : m === 'durationSec' ? formatDuration(v) : formatNumber(v))
  const delta = (k: Metric) => {
    const a = totals?.[k] ?? 0
    const b = prev.data?.totals[k] ?? 0
    if (!b) return undefined
    const pct = Math.round(((a - b) / b) * 100)
    return t('stats.vsPrevious', { pct: `${pct > 0 ? '+' : ''}${pct}` })
  }

  // Bars: days for a week or month, weeks for 3 months, months for a year.
  const today = todayIso()
  let bars: Bar[]
  if (unit === 'week' || unit === 'month') {
    bars = eachDay(from, to).map((d, i) => {
      const v = byDate.get(d)?.[metric] ?? 0
      return { key: d, label: unit === 'week' ? weekdayShort(i) : String(Number(d.slice(8))), value: v, title: `${formatDayShort(d)}: ${fmt(metric, v)}`, highlight: d === today }
    })
  } else if (unit === 'quarter') {
    bars = []
    for (let w = startOfWeek(from); w <= to; w = addDays(w, 7)) {
      const v = eachDay(w, addDays(w, 6)).reduce((n, d) => n + (byDate.get(d)?.[metric] ?? 0), 0)
      bars.push({ key: w, label: formatDayShort(w), value: v, title: `${t('stats.weekOf', { date: formatDayShort(w) })}: ${fmt(metric, v)}`, highlight: w === startOfWeek(today) })
    }
  } else {
    bars = Array.from({ length: 12 }, (_, i) => {
      const m = addMonths(from, i)
      const v = [...byDate.values()].filter((d) => d.date.slice(0, 7) === m.slice(0, 7)).reduce((n, d) => n + d[metric], 0)
      return { key: m, label: formatMonthShort(m), value: v, title: `${formatMonth(m)}: ${fmt(metric, v)}`, highlight: m.slice(0, 7) === today.slice(0, 7) }
    })
  }

  const periodLabel = unit === 'week' ? `${formatDayShort(from)} – ${formatDayShort(to)}` : unit === 'month' ? formatMonth(from) : unit === 'quarter' ? `${formatMonthShort(from)} – ${formatMonthShort(to)} ${to.slice(0, 4)}` : from.slice(0, 4)
  const muscleValues = Object.fromEntries((s?.byMuscle ?? []).filter((m) => m.muscle).map((m) => [m.muscle, m.sets]))
  const loading = stats.loading && !s

  return (
    <>
      <SectionHeader section="progress" />
      {(stats.error ?? year.error) && <ApiNotice error={(stats.error ?? year.error)!} onRetry={stats.reload} />}

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          label={t('stats.period')}
          value={unit}
          onChange={(u) => {
            setUnit(u)
            setAnchor(todayIso())
          }}
          options={[
            ['week', t('stats.week')],
            ['month', t('stats.month')],
            ['quarter', t('stats.quarter')],
            ['year', t('stats.year')],
          ]}
          className="w-full sm:w-auto"
        />
        <div className="flex flex-1 items-center justify-between gap-1 sm:justify-end">
          <IconButton label={t('common.previous')} onClick={() => setAnchor(shiftPeriod(unit, anchor, -1))}>
            <IconChevronLeft />
          </IconButton>
          <button type="button" onClick={() => setAnchor(todayIso())} className="min-w-0 truncate px-2 text-sm font-medium tabular-nums" title={t('common.today')}>
            {periodLabel}
          </button>
          <IconButton label={t('common.next')} disabled={to >= today} onClick={() => setAnchor(shiftPeriod(unit, anchor, 1))}>
            <IconChevronRight />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile label={t('stats.workouts')} value={totals?.workouts ?? 0} sub={delta('workouts')} loading={loading} />
        <StatTile label={t('stats.time')} value={formatDuration(totals?.durationSec ?? 0)} sub={delta('durationSec')} loading={loading} />
        <StatTile label={t('stats.sets')} value={formatNumber(totals?.sets ?? 0)} sub={delta('sets')} loading={loading} />
        <StatTile label={t('stats.volume')} value={formatKg(Math.round(totals?.volumeKg ?? 0))} sub={delta('volumeKg')} loading={loading} />
      </div>

      <Card
        title={t('stats.overTime')}
        action={
          <Tabs
            label={t('stats.metric')}
            value={metric}
            onChange={setMetric}
            options={[
              ['volumeKg', t('stats.volume')],
              ['sets', t('stats.sets')],
              ['durationSec', t('stats.time')],
              ['workouts', t('stats.workouts')],
            ]}
            className="text-xs [&_button]:px-2 [&_button]:text-xs"
          />
        }
      >
        <BarChart bars={bars} empty={loading ? undefined : t('stats.noData')} />
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card title={t('stats.muscles')}>
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <MuscleMap values={muscleValues} className="mx-auto w-full max-w-56" />
            {s?.byMuscle.length ? (
              <RankBars rows={s.byMuscle.slice(0, 10).map((m) => ({ key: m.muscle || '-', label: muscleName(m.muscle) || '—', value: m.sets }))} format={(n) => t('unit.sets', { count: n })} />
            ) : (
              <p className="text-sm text-subtle">{t('stats.noData')}</p>
            )}
          </div>
        </Card>
        <Card title={t('stats.topExercises')}>
          {s?.byExercise.length ? (
            <ul className="-mx-2 grid">
              {s.byExercise.slice(0, 8).map((e) => (
                <li key={e.exerciseId}>
                  <Link to={`/exercises/${encodeURIComponent(e.exerciseId)}`} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
                    <span className="min-w-0 flex-1 truncate">{byId.get(e.exerciseId)?.name ?? e.exerciseId}</span>
                    <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                      {t('unit.sets', { count: e.sets })}
                      {e.volumeKg > 0 && ` · ${formatKg(Math.round(e.volumeKg))}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-subtle">{t('stats.noData')}</p>
          )}
        </Card>
      </div>

      <Card
        title={t('stats.calendar')}
        action={
          <span className="inline-flex items-center gap-1.5 text-sm">
            <IconFlame className="size-4 text-cat-2" />
            {t('stats.streak', { count: weekStreak(yearDays) })}
          </span>
        }
      >
        <HeatCalendar
          weeks={53}
          values={new Map([...yearDays].map(([d, v]) => [d, v.sets]))}
          label={(d, v) => `${formatDayShort(d)}: ${v ? t('unit.sets', { count: v }) : t('stats.restDay')}`}
        />
      </Card>
    </>
  )
}
