import type { ColorKey } from '../lib/types'

/** Template colours. Class names are literal so Tailwind keeps them. */
export const COLORS: Record<ColorKey, { dot: string; text: string; border: string; soft: string }> = {
  c1: { dot: 'bg-accent', text: 'text-accent', border: 'border-accent', soft: 'bg-accent/15' },
  c2: { dot: 'bg-cat-1', text: 'text-cat-1', border: 'border-cat-1', soft: 'bg-cat-1/15' },
  c3: { dot: 'bg-cat-2', text: 'text-cat-2', border: 'border-cat-2', soft: 'bg-cat-2/15' },
  c4: { dot: 'bg-cat-4', text: 'text-cat-4', border: 'border-cat-4', soft: 'bg-cat-4/15' },
  c5: { dot: 'bg-cat-5', text: 'text-cat-5', border: 'border-cat-5', soft: 'bg-cat-5/15' },
  c6: { dot: 'bg-inc-2', text: 'text-inc-2', border: 'border-inc-2', soft: 'bg-inc-2/15' },
  c7: { dot: 'bg-inc-3', text: 'text-inc-3', border: 'border-inc-3', soft: 'bg-inc-3/15' },
  c8: { dot: 'bg-inc-5', text: 'text-inc-5', border: 'border-inc-5', soft: 'bg-inc-5/15' },
}

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[]

export const colorOf = (key: string | undefined) => COLORS[(key as ColorKey) in COLORS ? (key as ColorKey) : 'c1']
