import { addDays, dateOf, startOfWeek, todayIso } from '../lib/date'
import { cn } from '../lib/cn'
import { useFormat } from '../lib/format'

// Charts are plain HTML/CSS (no chart library), like DaFinance.

export interface Bar {
  key: string
  label: string
  value: number
  /** Tooltip / screen-reader text. */
  title: string
  highlight?: boolean
}

/** Vertical bars, single hue; labels thinned out when there are many bars. */
export function BarChart({ bars, height = 160, empty }: { bars: Bar[]; height?: number; empty?: string }) {
  const max = Math.max(0, ...bars.map((b) => b.value))
  const every = bars.length > 16 ? Math.ceil(bars.length / 8) : 1
  if (!max && empty) return <p className="grid place-items-center text-sm text-subtle" style={{ height }}>{empty}</p>
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }} role="list">
        {bars.map((b) => (
          <div key={b.key} role="listitem" title={b.title} aria-label={b.title} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className={cn('w-full rounded-t-[3px] transition-[height] duration-500', b.value ? (b.highlight ? 'bg-accent' : 'bg-accent/60 group-hover:bg-accent/80') : 'bg-surface-2')}
              style={{ height: b.value ? `${Math.max(3, (b.value / (max || 1)) * 100)}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {bars.map((b, i) => (
          <div key={b.key} className={cn('min-w-0 flex-1 truncate text-center font-mono text-[10px] text-subtle', b.highlight && 'text-fg')}>
            {i % every === 0 ? b.label : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Horizontal ranked bars. */
export function RankBars({ rows, format }: { rows: { key: string; label: string; value: number; href?: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className="truncate text-muted">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-accent/70" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="font-mono text-xs tabular-nums">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  )
}

/** GitHub-style calendar: one column per week (Monday on top), `weeks` weeks ending this week. */
export function HeatCalendar({ values, weeks = 26, label }: { values: Map<string, number>; weeks?: number; label: (date: string, v: number) => string }) {
  const { weekdayShort, formatMonthShort } = useFormat()
  const today = todayIso()
  const first = addDays(startOfWeek(today), -7 * (weeks - 1))
  const max = Math.max(1, ...values.values())
  const columns = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)))
  return (
    <div className="flex gap-1.5">
      <div className="grid grid-rows-[repeat(7,minmax(0,1fr))] gap-[3px] pt-4 font-mono text-[9px] text-subtle">
        {[0, 2, 4, 6].map((d) => (
          <span key={d} style={{ gridRow: d + 1 }} className="leading-none">
            {weekdayShort(d)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:thin]">
        <div className="grid min-w-max auto-cols-[minmax(10px,1fr)] grid-flow-col gap-[3px]">
          {columns.map((days) => (
            <div key={days[0]} className="grid gap-[3px]">
              <span className="h-3.5 font-mono text-[9px] leading-none text-subtle">{dateOf(days[0] ?? today).getDate() <= 7 ? formatMonthShort(days[0] ?? today) : ''}</span>
              {days.map((d) => {
                const v = values.get(d) ?? 0
                return (
                  <span
                    key={d}
                    title={label(d, v)}
                    className={cn('aspect-square min-w-2.5 rounded-[3px]', d > today ? 'opacity-0' : !v && 'bg-surface-2', d === today && 'ring-1 ring-muted')}
                    style={v ? { backgroundColor: `color-mix(in oklab, var(--accent) ${Math.round(35 + (v / max) * 65)}%, var(--surface-2))` } : undefined}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
