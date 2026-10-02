import { Link } from 'react-router-dom'
import { useFormat } from '../lib/format'
import type { Workout } from '../lib/types'
import { useI18n } from '../locales'
import { IconChevronRight } from './icons'

/** One finished workout in a list: date, name, duration, sets, volume, main muscles. */
export function WorkoutRow({ workout: w }: { workout: Workout }) {
  const { t } = useI18n()
  const { formatDayHeader, formatDuration, formatKg, muscleName } = useFormat()
  const muscles = [...new Set(w.exercises.filter((e) => e.sets.some((s) => s.done)).map((e) => e.muscle).filter(Boolean))]
  return (
    <Link to={`/history/${w.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold">{w.name || t('workout.untitled')}</span>
          <span className="shrink-0 text-xs text-subtle">{formatDayHeader(w.date)}</span>
        </div>
        <div className="mt-0.5 truncate font-mono text-xs text-muted tabular-nums">
          {formatDuration(w.durationSec)} · {t('unit.sets', { count: w.totalSets ?? 0 })}
          {(w.volumeKg ?? 0) > 0 && ` · ${formatKg(Math.round(w.volumeKg ?? 0))}`}
        </div>
        {muscles.length > 0 && <div className="mt-0.5 truncate text-xs text-subtle">{muscles.slice(0, 5).map(muscleName).join(' · ')}</div>}
      </div>
      <IconChevronRight className="size-4 shrink-0 text-subtle" />
    </Link>
  )
}
