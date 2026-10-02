import type { ReactNode } from 'react'
import { useFormat } from '../lib/format'
import { useI18n } from '../locales'

// Stylised front / back body. Each shape is one free-exercise-db muscle key. Used as a filter in the
// dictionary (click a muscle) and as a heat map in the statistics (`values`).

type Shape = { m: string; el: ReactNode }
const e = (cx: number, cy: number, rx: number, ry: number) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
const pair = (m: string, cx: number, cy: number, rx: number, ry: number, mid: number): Shape[] => [
  { m, el: e(cx, cy, rx, ry) },
  { m, el: e(2 * mid - cx, cy, rx, ry) },
]

const FRONT: Shape[] = [
  { m: 'neck', el: <rect x="45" y="25" width="10" height="8" rx="2" /> },
  ...pair('shoulders', 31, 40, 8, 7, 50),
  { m: 'chest', el: <rect x="37" y="34" width="12.4" height="17" rx="4" /> },
  { m: 'chest', el: <rect x="50.6" y="34" width="12.4" height="17" rx="4" /> },
  ...pair('biceps', 26, 56, 5, 10, 50),
  ...pair('forearms', 22, 78, 4.5, 11, 50),
  { m: 'abdominals', el: <rect x="42" y="53" width="16" height="31" rx="4" /> },
  ...pair('quadriceps', 39.5, 114, 7, 21, 50),
  ...pair('adductors', 47, 104, 2.6, 11, 50),
  ...pair('calves', 40, 154, 5, 13, 50),
]

const BACK: Shape[] = [
  { m: 'neck', el: <rect x="145" y="25" width="10" height="5" rx="2" /> },
  { m: 'traps', el: <polygon points="150,27 163,37 156,44 144,44 137,37" /> },
  ...pair('shoulders', 131, 40, 8, 7, 150),
  { m: 'middle back', el: <polygon points="144,45.5 156,45.5 154,62 146,62" /> },
  { m: 'lats', el: <polygon points="138,46 143,46 145,64 147,72 140,70 135,56" /> },
  { m: 'lats', el: <polygon points="162,46 157,46 155,64 153,72 160,70 165,56" /> },
  ...pair('triceps', 126, 57, 5, 10, 150),
  ...pair('forearms', 122, 78, 4.5, 11, 150),
  { m: 'lower back', el: <rect x="143" y="64" width="14" height="18" rx="3" /> },
  ...pair('glutes', 143.5, 93, 7.5, 8.5, 150),
  ...pair('abductors', 134, 92, 2.6, 7, 150),
  ...pair('hamstrings', 141.5, 119, 7, 16, 150),
  ...pair('calves', 141, 152, 6, 13, 150),
]

const SILHOUETTE = (
  <g className="fill-surface">
    <circle cx="50" cy="15" r="9.5" />
    <circle cx="150" cy="15" r="9.5" />
    <circle cx="21" cy="94" r="3.5" />
    <circle cx="79" cy="94" r="3.5" />
    <circle cx="121" cy="94" r="3.5" />
    <circle cx="179" cy="94" r="3.5" />
    <ellipse cx="41" cy="171" rx="4.5" ry="3" />
    <ellipse cx="59" cy="171" rx="4.5" ry="3" />
    <ellipse cx="141" cy="170" rx="4.5" ry="3" />
    <ellipse cx="159" cy="170" rx="4.5" ry="3" />
    <rect x="37" y="84" width="26" height="9" rx="4" />
  </g>
)

export function MuscleMap({ selected, onSelect, values, className }: { selected?: string | null; onSelect?: (m: string | null) => void; values?: Record<string, number>; className?: string }) {
  const { t } = useI18n()
  const { muscleName } = useFormat()
  const max = Math.max(1, ...Object.values(values ?? {}))

  const fill = (m: string) => {
    if (selected === m) return 'var(--accent)'
    const v = values?.[m]
    if (v) return `color-mix(in oklab, var(--accent) ${Math.round(20 + (v / max) * 75)}%, var(--surface-2))`
    return 'var(--surface-2)'
  }

  const draw = (shapes: Shape[]) =>
    shapes.map(({ m, el }, i) => (
      // Pointer shortcut only: the muscle chips next to the map are the keyboard-accessible control.
      <g
        key={`${m}-${i}`}
        style={{ fill: fill(m) }}
        className={onSelect ? 'cursor-pointer stroke-border-strong transition-[fill] hover:stroke-muted' : 'stroke-border-strong'}
        strokeWidth={0.6}
        onClick={onSelect ? () => onSelect(selected === m ? null : m) : undefined}
      >
        <title>{values?.[m] ? `${muscleName(m)}: ${values[m]}` : muscleName(m)}</title>
        {el}
      </g>
    ))

  return (
    <svg viewBox="0 0 200 186" role="img" aria-label={t('muscles.map')} className={className}>
      {SILHOUETTE}
      {draw(FRONT)}
      {draw(BACK)}
      <text x="50" y="184" textAnchor="middle" className="fill-subtle font-mono text-[6px] tracking-wider uppercase">
        {t('muscles.front')}
      </text>
      <text x="150" y="184" textAnchor="middle" className="fill-subtle font-mono text-[6px] tracking-wider uppercase">
        {t('muscles.back')}
      </text>
    </svg>
  )
}
