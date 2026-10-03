import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/cn'
import { clock } from '../lib/format'
import { useNow, useSession } from '../lib/session'
import { useI18n } from '../locales'
import { IconChevronRight, IconTimer } from './icons'

/**
 * Floating bar above the bottom navigation: the rest countdown (with −15 / +15 / skip) whenever a
 * rest runs, otherwise a "workout in progress" link on pages other than the workout itself. On the
 * pages of the exercises of the workout the rest shows in their rest ring instead.
 */
export function SessionBar() {
  const { t } = useI18n()
  const { workout, rest, adjustRest, skipRest } = useSession()
  const { pathname } = useLocation()
  const now = useNow(!!workout, rest ? 200 : 1000)
  if (!workout) return null

  if (rest && !/^\/workout\/\d+$/.test(pathname)) {
    const left = Math.max(0, (rest.endsAt - now) / 1000)
    const over = left <= 0
    const pct = over ? 100 : Math.min(100, 100 - (left / rest.totalSec) * 100)
    return (
      <div role="timer" aria-live="off" className="pointer-events-auto mx-auto w-full max-w-xl px-3">
        <div className={cn('relative overflow-hidden rounded-2xl border shadow-2xl shadow-black/50', over ? 'border-income bg-income/20' : 'border-border-strong bg-surface-2')}>
          <div aria-hidden="true" className="absolute inset-y-0 left-0 bg-accent/15 transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
          <div className="relative flex items-center gap-2 px-3 py-2.5">
            <IconTimer className={cn('size-5 shrink-0', over ? 'text-income' : 'text-accent')} />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] tracking-wider text-subtle uppercase">{over ? t('rest.over') : t('rest.title')}</div>
              <div className="font-mono text-2xl leading-tight font-semibold tabular-nums">{clock(Math.ceil(left))}</div>
            </div>
            <button type="button" onClick={() => adjustRest(-15)} className="rounded-lg border border-border-strong px-2.5 py-2 font-mono text-xs hover:bg-surface">
              −15
            </button>
            <button type="button" onClick={() => adjustRest(15)} className="rounded-lg border border-border-strong px-2.5 py-2 font-mono text-xs hover:bg-surface">
              +15
            </button>
            <button type="button" onClick={skipRest} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-fg hover:opacity-90">
              {over ? t('common.close') : t('rest.skip')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (rest || pathname.startsWith('/workout')) return null
  return (
    <div className="pointer-events-auto mx-auto w-full max-w-xl px-3">
      <Link to="/workout" className="flex items-center gap-3 rounded-2xl border border-accent/50 bg-surface-2 px-4 py-2.5 shadow-2xl shadow-black/50 hover:border-accent">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold">{t('session.inProgress')}</span>
          {workout.name && <span className="text-muted"> · {workout.name}</span>}
        </span>
        <span className="font-mono text-sm text-accent tabular-nums">{clock((now - new Date(workout.startedAt).getTime()) / 1000)}</span>
        <IconChevronRight className="size-4 text-muted" />
      </Link>
    </div>
  )
}
