import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

/** Circular progress (0…1) with content in the middle. Size comes from the class. */
export function Ring({ value, children, className, tone = 'accent', strokeWidth = 7 }: { value: number; children?: ReactNode; className?: string; tone?: 'accent' | 'warn' | 'muted'; strokeWidth?: number }) {
  const r = 50 - strokeWidth / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className={cn('relative grid shrink-0 place-items-center', className)}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth={strokeWidth} className="stroke-surface-2" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={cn('transition-[stroke-dashoffset] duration-500', tone === 'accent' ? 'stroke-accent' : tone === 'warn' ? 'stroke-cat-1' : 'stroke-border-strong', v === 0 && 'opacity-0')}
        />
      </svg>
      <div className="relative grid place-items-center text-center">{children}</div>
    </div>
  )
}
